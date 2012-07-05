test:
	@./node_modules/.bin/mocha \
		--globals const

.PHONY: test