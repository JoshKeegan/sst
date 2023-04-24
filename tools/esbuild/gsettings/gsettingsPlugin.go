package gsettings

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path"
	"strings"

	"github.com/evanw/esbuild/pkg/api"
)

const pluginName = "GSettings Compiler"

var GSettingsPlugin = api.Plugin{
	Name: pluginName,
	Setup: func(build api.PluginBuild) {
		build.OnEnd(func(result *api.BuildResult) (api.OnEndResult, error) {
			// So that esbuild watches for changes, the xml schema is registered with an empty
			// loader. Delete the empty file esbuild will have created
			err := deleteEmptyJsFile(build.InitialOptions.Outdir)
			if err != nil {
				return api.OnEndResult{}, fmt.Errorf("deleting empty js: %w", err)
			}

			var errors []api.Message
			cmd := exec.Command(
				"glib-compile-schemas",
				"--strict",
				"schemas/",
				"--targetdir="+build.InitialOptions.Outdir+"/schemas/")
			data, err := cmd.CombinedOutput()
			if err != nil {
				errors = []api.Message{
					{
						PluginName: pluginName,
						Text:       string(data),
					},
				}
			}

			return api.OnEndResult{
				Errors:   errors,
				Warnings: nil,
			}, nil
		})
	},
}

func deleteEmptyJsFile(outDir string) error {
	schemasPath := path.Join(outDir, "schemas")
	files, err := os.ReadDir(schemasPath)
	if err != nil {
		return fmt.Errorf("reading schemas output files: %w", err)
	}

	for _, file := range files {
		if strings.HasSuffix(file.Name(), ".gschema.js") {
			err := os.Remove(path.Join(schemasPath, file.Name()))
			if err != nil {
				return fmt.Errorf("deleting empty js: %w", err)
			}
			return nil
		}
	}

	return errors.New("empty js file not found for deletion")
}
