.PHONY: lint
lint:
	@docker run --rm \
		-v $(PWD):/check \
		mstruebing/editorconfig-checker && \
	echo "Editorconfig styles followed"

.PHONY: settings-schema-compile
settings-schema-compile:
	glib-compile-schemas schemas/

ci: lint