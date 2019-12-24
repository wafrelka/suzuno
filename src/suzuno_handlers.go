package main

import (
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"image/jpeg"
	"io"
	"net/http"
	"os"
	"path"
	"strings"
	"time"
)

const (
	READDIR_BATCH_SIZE = 200
)

type BatchRequest struct {
	Targets []string `json:"targets"`
}

func is_closed(req *http.Request) bool {
	select {
	case <-req.Context().Done():
		return true
	default:
		return false
	}
}

func open_file_or_abort(native_path, etag_prefix string, w http.ResponseWriter, req *http.Request) *os.File {

	stat, err := os.Stat(native_path)
	if err != nil && !os.IsNotExist(err) {
		http.Error(w, "stat failed", http.StatusInternalServerError)
		return nil
	}

	ok := (err == nil && stat.Mode().IsRegular())
	if !ok {
		http.NotFound(w, req)
		return nil
	}

	file, err := os.Open(native_path)
	if err != nil {
		http.Error(w, "IO failed", http.StatusInternalServerError)
		return nil
	}

	hasher := sha1.New()
	_, err = io.Copy(hasher, file)
	if err != nil {
		http.Error(w, "IO failed", http.StatusInternalServerError)
		file.Close()
		return nil
	}
	etag := fmt.Sprintf("\"%s%x\"", etag_prefix, hasher.Sum(nil))

	if match := req.Header.Get("If-None-Match"); match != "" {
		if strings.Contains(match, etag) {
			w.WriteHeader(http.StatusNotModified)
			file.Close()
			return nil
		}
	}
	w.Header().Set("Etag", etag)

	file.Seek(0, 0)
	return file
}

func (s *SuzunoServer) serve_file(w http.ResponseWriter, req *http.Request) {

	native_path := get_native_path(s.root, req.URL.Path)
	file := open_file_or_abort(native_path, "file:v1:", w, req)

	if file == nil {
		return
	}
	defer file.Close()

	http.ServeContent(w, req, native_path, time.Time{}, file)
}

func (s *SuzunoServer) serve_thumbnail(w http.ResponseWriter, req *http.Request) {

	native_path := get_native_path(s.root, req.URL.Path)
	file := open_file_or_abort(native_path, "thumbnail:v1:", w, req)

	if file == nil {
		return
	}
	defer file.Close()

	weight, err := calculate_weight(file)
	if err != nil {
		err_msg := fmt.Sprintf("thumbnail error: %v\n", err)
		fmt.Fprintf(os.Stderr, "[%s, 500] thumbnail error: %v\n", req.URL.Path, err)
		http.Error(w, err_msg, http.StatusInternalServerError)
		return
	}

	sem_err := s.thumbnail_semaphore.Acquire(req.Context(), weight)
	if sem_err != nil {
		return
	}
	if is_closed(req) {
		s.thumbnail_semaphore.Release(weight)
		return
	}

	img, err := generate_thumbnail(file)
	s.thumbnail_semaphore.Release(weight)

	if err != nil {
		err_msg := fmt.Sprintf("thumbnail error: %v\n", err)
		fmt.Fprintf(os.Stderr, "[%s, 500] thumbnail error: %v\n", req.URL.Path, err)
		http.Error(w, err_msg, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "image/jpeg")
	jpeg.Encode(w, img, nil)
}

func (s *SuzunoServer) serve_meta_directory(w http.ResponseWriter, req *http.Request) {

	native_path := get_native_path(s.root, req.URL.Path)

	stat, err := os.Stat(native_path)
	if err != nil && !os.IsNotExist(err) {
		http.Error(w, "stat failed", http.StatusInternalServerError)
		return
	}

	ok := (err == nil && stat.IsDir())
	if !ok {
		http.NotFound(w, req)
		return
	}

	dir, err := os.Open(native_path)
	if err != nil {
		http.Error(w, "io failed", http.StatusInternalServerError)
		return
	}

	resp := struct {
		Resources []ResourceInfo `json:"resources"`
		Path string `json:"path"`
	}{
		Resources: []ResourceInfo{},
		Path: req.URL.Path,
	}

	for {

		if is_closed(req) {
			return
		}

		entries, err := dir.Readdir(READDIR_BATCH_SIZE)

		if err == io.EOF {
			break
		}
		if err != nil {
			http.Error(w, "io failed", http.StatusInternalServerError)
			return
		}

		for _, entry := range entries {
			entry_slash_path := path.Join(req.URL.Path, entry.Name())
			res, ok := s.get_resource_info(entry_slash_path, entry)
			if ok {
				resp.Resources = append(resp.Resources, res)
			}
		}
	}

	bin, err := json.Marshal(&resp)
	if err != nil {
		http.Error(w, "marshaling failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(bin)
}

func (s *SuzunoServer) serve_meta_batch(w http.ResponseWriter, req *http.Request) {

	if req.Method != "POST" {
		http.Error(w, "method mismatch", http.StatusBadRequest)
		return
	}

	if req.Header.Get("Content-Type") != "application/json" {
		http.Error(w, "Content-Type mismatch", http.StatusBadRequest)
		return
	}

	var batch_req BatchRequest
	if err := json.NewDecoder(req.Body).Decode(&batch_req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	resp := struct {
		Resources []ResourceInfo `json:"resources"`
	}{
		Resources: []ResourceInfo{},
	}

	batch_read_count := 0

	for _, target := range batch_req.Targets {

		native_path := get_native_path(s.root, target)
		entry, err := os.Stat(native_path)

		if err != nil && !os.IsNotExist(err) {
			http.Error(w, "stat failed", http.StatusInternalServerError)
			return
		}

		if os.IsNotExist(err) {
			res := make_empty_resource_info(target, path.Base(target))
			resp.Resources = append(resp.Resources, res)
		} else {
			res, ok := s.get_resource_info(target, entry)
			if !ok {
				res = make_empty_resource_info(target, path.Base(target))
			}
			resp.Resources = append(resp.Resources, res)
		}

		batch_read_count += 1
		if batch_read_count >= READDIR_BATCH_SIZE {
			batch_read_count = 0
			if is_closed(req) {
				return
			}
		}
	}

	bin, err := json.Marshal(&resp)
	if err != nil {
		http.Error(w, "marshaling failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(bin)
}
