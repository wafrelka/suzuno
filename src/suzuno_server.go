package main

import (
	"net/http"
	"path"
	"strings"
	"github.com/markbates/pkger"
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
}

func assign_sub_handler(mux *http.ServeMux, prefix_slash string, h http.Handler) {
	if !strings.HasSuffix(prefix_slash, "/") {
		panic("prefix without a trailing slash is not permitted")
	}
	prefix_noslash := strings.TrimSuffix(prefix_slash, "/")
	mux.Handle(prefix_slash, http.StripPrefix(prefix_noslash, h))
}

func NewSuzunoServer(root string) *SuzunoServer {

	s := SuzunoServer{
		mux: http.NewServeMux(),
		root: root,
		thumbnail_url_prefix: "/thumbnail",
	}
	static_fs := FileSystemHandler(func(name string) (http.File, error) {
		res_path := path.Join("/resources", strings.TrimPrefix(name, "/"))
		file, err := pkger.Open(res_path)
		return file, err
	})

	assign_sub_handler(s.mux, "/static/", http.FileServer(static_fs))
	assign_sub_handler(s.mux, "/thumbnail/", http.HandlerFunc(s.serve_thumbnail))
	assign_sub_handler(s.mux, "/meta/directory/", http.HandlerFunc(s.serve_meta_directory))

	s.mux.Handle("/view/", PkgerSingleFileHandler("/resources/view.html"))
	s.mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		if req.URL.Path == "/" {
			http.Redirect(w, req, "/view/", http.StatusFound)
		} else {
			http.NotFound(w, req)
		}
	}))

	return &s
}

func (s *SuzunoServer) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	s.mux.ServeHTTP(w, req)
}
