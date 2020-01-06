package main

import (
	"net/http"
	"path"
	"strings"
	"github.com/markbates/pkger"
	"golang.org/x/sync/semaphore"
)

type FileSystemHandler func(string) (http.File, error)

func (fs_handler FileSystemHandler) Open(name string) (http.File, error) {
	file, err := fs_handler(name)
	return file, err
}

type PkgerSingleFileHandler string

func (pkger_handler PkgerSingleFileHandler) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	pkger_path := string(pkger_handler)
	file, err := pkger.Open(pkger_path)
	if err != nil {
		http.Error(w, "pkger error", http.StatusInternalServerError)
		return
	}
	defer file.Close()
	stat, err := file.Stat()
	if err != nil {
		http.Error(w, "pkger error", http.StatusInternalServerError)
		return
	}
	http.ServeContent(w, req, path.Base(pkger_path), stat.ModTime(), file)
}

type SuzunoServer struct {
	mux *http.ServeMux
	root string
	thumbnail_url_prefix string
	file_url_prefix string
	thumbnail_semaphore *semaphore.Weighted
}

func assign_sub_handler(mux *http.ServeMux, prefix_slash string, h http.Handler) {
	if !strings.HasSuffix(prefix_slash, "/") {
		panic("prefix without a trailing slash is not permitted")
	}
	prefix_noslash := strings.TrimSuffix(prefix_slash, "/")
	mux.Handle(prefix_slash, http.StripPrefix(prefix_noslash, h))
}

func assign_single_point(mux *http.ServeMux, path string, h http.Handler) {
	mux.Handle(path, http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		if req.URL.Path == path {
			h.ServeHTTP(w, req)
		} else {
			http.NotFound(w, req)
		}
	}))
}

func NewSuzunoServer(root string) *SuzunoServer {

	s := SuzunoServer{
		mux: http.NewServeMux(),
		root: root,
		thumbnail_url_prefix: "/thumbnail",
		file_url_prefix: "/file",
		thumbnail_semaphore: semaphore.NewWeighted(20),
	}
	static_fs := FileSystemHandler(func(name string) (http.File, error) {
		res_path := path.Join("/assets", strings.TrimPrefix(name, "/"))
		file, err := pkger.Open(res_path)
		return file, err
	})

	assign_sub_handler(s.mux, "/static/", http.FileServer(static_fs))
	assign_sub_handler(s.mux, "/file/", http.HandlerFunc(s.serve_file))
	assign_sub_handler(s.mux, "/thumbnail/", http.HandlerFunc(s.serve_thumbnail))
	assign_sub_handler(s.mux, "/meta/directory/", http.HandlerFunc(s.serve_meta_directory))

	s.mux.Handle("/view/", PkgerSingleFileHandler("/assets/view.html"))
	assign_single_point(s.mux, "/", http.RedirectHandler("/view/", http.StatusFound))

	return &s
}

func (s *SuzunoServer) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	s.mux.ServeHTTP(w, req)
}
