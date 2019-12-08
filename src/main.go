package main

import (
	"fmt"
	"net"
	"net/http"
	"os"
	"golang.org/x/net/netutil"
)

const (
	LISTENING_ADDRESS = ":8080"
)

func run() int {

	root := "."
	if len(os.Args) >= 2 {
		root = os.Args[1]
	}

	http_config := &http.Server{
		Handler: NewSuzunoServer(root),
	}

	listener, err := net.Listen("tcp", LISTENING_ADDRESS)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		return 1
	}

	err = http_config.Serve(netutil.LimitListener(listener, 20))
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		return 1
	}

	return 0
}

func main() {
	os.Exit(run())
}
