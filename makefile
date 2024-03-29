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
	ln -s "$(PWD)/build" ~/.local/share/gnome-shell/extensions/$(EXTENSION)

.PHONY: uninstall
uninstall:
	rm -rf ~/.local/share/gnome-shell/extensions/$(EXTENSION)

.PHONY: build-watch
build-watch: build-tools
	yarn dev

.PHONY: gnome-shell-logs
gnome-shell-logs:
ifeq ($(XDG_SESSION_TYPE),x11)
	journalctl -f -o cat /usr/bin/gnome-shell
else ifeq ($(XDG_SESSION_TYPE),wayland)
	dbus-run-session -- gnome-shell --nested --wayland
else
	$(error Unrecognised XDG_SESSION_TYPE)
endif

.PHONY: enable
enable:
	gnome-extensions enable $(EXTENSION)

.PHONY: disable
disable:
	gnome-extensions disable $(EXTENSION)
