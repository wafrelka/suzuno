GO := go
PKGER := pkger
SRC_DIR := src
SRC_PKGER := src/pkged.go
ASSETS_DIR := /assets
DEST := suzuno
PKGER_URL := github.com/markbates/pkger/cmd/pkger

.PHONY: build pack install_pkger clean

build: pack
	$(GO) build -o $(DEST) $(SRC_DIR)/*
	$(RM) $(SRC_PKGER)
pack:
	$(PKGER) -include $(ASSETS_DIR) -o $(SRC_DIR)
install_pkger:
	$(GO) get $(PKGER_URL)
clean:
	$(RM) $(DEST) $(SRC_PKGER)
