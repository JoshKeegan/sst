EXTENSION := sst@joshkeegan.co.uk

.PHONY: default
default: build-tools build

.PHONY: clean
clean:
	rm -rf build/* || true

.PHONY: lint
lint:
	@docker run --rm \
		-v $(PWD):/check \
		mstruebing/editorconfig-checker && \
	echo "Editorconfig styles followed"

.PHONY: ci
ci: lint build-tools test-tools build

.PHONY: test-tools
test-tools:
	(cd tools && go test -v ./...)

.PHONY: build-tools
build-tools:
	(cd tools/esbuild && go build -o ../bin/)
	(cd tools/xUpdateSizeHints && go build -o ../../build/)

.PHONY: build
build:
	yarn install --frozen-lockfile
	yarn build

.PHONY: install
install:
	mkdir -p ~/.local/share/gnome-shell/extensions
	ln -s "$(PWD)/build" ~/.local/share/gnome-shell/extensions/$(EXTENSION)

.PHONY: uninstall
uninstall:
	rm -rf ~/.local/share/gnome-shell/extensions/$(EXTENSION)

.PHONY: build-watch
build-watch: build-tools
	yarn dev

.PHONY: gnome-shell-logs
gnome-shell-logs:
	journalctl -f -o cat /usr/bin/gnome-shell

.PHONY: enable
enable:
	gnome-extensions enable $(EXTENSION)

.PHONY: disable
disable:
	gnome-extensions disable $(EXTENSION)
