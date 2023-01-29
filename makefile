.PHONY: lint
lint:
	@docker run --rm \
		-v $(PWD):/check \
		mstruebing/editorconfig-checker && \
	echo "Editorconfig styles followed"

ci: lint