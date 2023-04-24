package main

import (
	"fmt"
	"os"
	"regexp"

	"github.com/evanw/esbuild/pkg/api"
)

var girRegex = regexp.MustCompile(`import (\w+) from ["']@girs/.+["']`)

var gjsPlugin = api.Plugin{
	Name: "GJS Import Converter",
	Setup: func(build api.PluginBuild) {
		build.OnLoad(api.OnLoadOptions{Filter: `.*\.ts`},
			func(args api.OnLoadArgs) (api.OnLoadResult, error) {
				data, err := os.ReadFile(args.Path)
				if err != nil {
					return api.OnLoadResult{}, fmt.Errorf("reading file: %w", err)
				}
				contents := string(data)
				contents = girRegex.ReplaceAllString(contents, "const { $1 } = imports.gi")

				return api.OnLoadResult{
					Contents: &contents,
					Loader:   api.LoaderTS,
				}, nil
			})
	},
}
