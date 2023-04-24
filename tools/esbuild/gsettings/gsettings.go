package gsettings

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strings"

	"github.com/evanw/esbuild/pkg/api"
)

const pluginName = "GSettings Compiler"

var Plugin = api.Plugin{
	Name: pluginName,
	Setup: func(build api.PluginBuild) {
		build.OnEnd(func(result *api.BuildResult) (api.OnEndResult, error) {
			// So that esbuild watches for changes, the xml schema is registered with an empty
			// loader. Delete the empty file esbuild will have created & update the build result
			// so that it shows we build gschemas.compiled
			schemasPath := path.Join(build.InitialOptions.Outdir, "schemas")
			file, err := findGSettingsJsFile(schemasPath, result.OutputFiles)
			if err != nil {
				return api.OnEndResult{}, fmt.Errorf("finding GSchema JS file: %w", err)
			}

			err = os.Remove(file.Path)
			if err != nil {
				return api.OnEndResult{}, fmt.Errorf("deleting GSchema js file: %w", err)
			}

			res := api.OnEndResult{}
			cmd := exec.Command(
				"glib-compile-schemas",
				"--strict",
				"src/schemas/",
				"--targetdir="+schemasPath)
			data, err := cmd.CombinedOutput()
			if err != nil {
				res.Errors = append(res.Errors, api.Message{
					PluginName: pluginName,
					Text:       string(data),
				})
			} else {
				// Update the file in the esbuild output
				dir, _ := path.Split(file.Path)
				file.Path = path.Join(dir, "gschemas.compiled")

				// Load content so esbuild can display the file size
				file.Contents, err = os.ReadFile(file.Path)
				if err != nil {
					res.Warnings = append(res.Warnings, api.Message{
						PluginName: pluginName,
						Text:       fmt.Sprintf("Error reading gschemas.compiled for content length: %v", err),
					})
				}
			}

			return res, nil
		})
	},
}

func findGSettingsJsFile(schemasPath string, outputFiles []api.OutputFile) (*api.OutputFile, error) {
	absSchemasPath, err := filepath.Abs(schemasPath)
	if err != nil {
		return nil, fmt.Errorf("finding absolute output schemas dir path: %w", err)
	}

	for i, file := range outputFiles {
		if strings.HasPrefix(file.Path, absSchemasPath+"/") &&
			strings.HasSuffix(file.Path, ".gschema.js") {
			return &outputFiles[i], nil
		}
	}
	return nil, errors.New("cannot find GSchema JS file in esbuild output files")
}
