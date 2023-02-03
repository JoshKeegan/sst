.PHONY: lint
lint:
	@docker run --rm \
		-v $(PWD):/check \
		mstruebing/editorconfig-checker && \
	echo "Editorconfig styles followed"

ci: lint

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