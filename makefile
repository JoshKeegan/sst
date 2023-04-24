EXTENSION := sst@joshkeegan.co.uk

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
ci: lint

.PHONY: build-tools
build-tools:
	(cd tools/esbuild && go build -o ../bin/)
	(cd tools/xUpdateSizeHints && go build -o ../../build/)

build:
	yarn
	yarn build

.PHONY: install
install: build
	ln -s "$(PWD)/build" ~/.local/share/gnome-shell/extensions/$(EXTENSION)

.PHONY: uninstall
uninstall:
	rm -rf ~/.local/share/gnome-shell/extensions/$(EXTENSION)

.PHONY: build-watch
build-watch: build-tools
	yarn dev

# TODO: Can settings compilation be moved into eslint?
# Currently it won't out to the build/ dir, or watched for changes
.PHONY: settings-schema-compile
settings-schema-compile:
	glib-compile-schemas schemas/

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
