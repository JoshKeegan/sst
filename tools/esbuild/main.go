package main

import (
	"errors"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/JoshKeegan/sst/tools/esbuild/gjs"
	"github.com/JoshKeegan/sst/tools/esbuild/gsettings"
	"github.com/evanw/esbuild/pkg/api"
)

func main() {
	help := flag.Bool("help", false, "Show help")
	watch := flag.Bool("watch", false, "Listen for changes and automatically rebuild")

	flag.Parse()
	if *help {
		flag.Usage()
		return
	}

	err := run(*watch)
	if err != nil {
		log.Printf("Fatal error: %v\n", err)
		os.Exit(-1)
	}
}

func run(watchMode bool) error {
	buildOptions := api.BuildOptions{
		LogLevel: api.LogLevelInfo,
		EntryPoints: []string{
			"src/extension.ts",
			"src/stylesheet.css",
			"src/config.default.json",
			"src/metadata.json",
			"src/schemas/org.gnome.shell.extensions.sst.gschema.xml",
		},
		Loader: map[string]api.Loader{
			".json":        api.LoaderCopy,
			".gschema.xml": api.LoaderEmpty,
		},
		Outdir: "build",
		Write:  true,
		Bundle: true,
		Engines: []api.Engine{
			// For SpiderMonkey updates check GJS release notes: https://gitlab.gnome.org/GNOME/gjs/-/blob/master/NEWS
			//{Name: api.EngineFirefox, Version: "60"},  // Since GJS 1.53.90
			//{Name: api.EngineFirefox, Version: "68"}, // Since GJS 1.63.90
			//{Name: api.EngineFirefox, Version: "78"},  // Since GJS 1.65.90
			//{Name: api.EngineFirefox, Version: "91"},  // Since GJS 1.71.1
			//{Name: api.EngineFirefox, Version: "102"}, // Since GJS 1.73.2
			{Name: api.EngineFirefox, Version: "115"}, // Since GJS 1.77.2
		},
		Format:      api.FormatESModule,
		TreeShaking: api.TreeShakingFalse,
		External: []string{
			"gi://*",
			"resource:///org/gnome/shell/*",
		},
		Plugins: []api.Plugin{
			gjs.Plugin,
			gsettings.Plugin,
		},
	}

	if watchMode {
		return watch(buildOptions)
	}
	return build(buildOptions)
}

func watch(options api.BuildOptions) error {
	ctx, ctxErr := api.Context(options)
	if ctxErr != nil {
		return fmt.Errorf("creating esbuild context: %w", ctxErr)
	}

	err := ctx.Watch(api.WatchOptions{})
	if err != nil {
		return fmt.Errorf("watch: %w", err)
	}
	fmt.Printf("watching...\n")

	// Block forever so we keep watching and don't exit.
	<-make(chan struct{})
	return nil
}

func build(options api.BuildOptions) error {
	res := api.Build(options)

	if len(res.Errors) > 0 {
		return errors.New("build failed with errors")
	}
	return nil
}
