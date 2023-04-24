package main

import (
	"bytes"
	"flag"
	"fmt"
	"os"
	"strconv"

	"github.com/JoshKeegan/sst/tools/xUpdateSizeHints/models"
	"github.com/jezek/xgb/xproto"
	"github.com/jezek/xgbutil"
	"github.com/jezek/xgbutil/xprop"
)

func main() {
	help := flag.Bool("help", false, "Show help")
	ptrId := flag.String("id", "", "X Window ID in hexadecimal")

	flag.Parse()
	if *help {
		flag.Usage()
		return
	}

	id := *ptrId
	if id == "" {
		fmt.Printf("id flag is required")
		os.Exit(1)
	}

	if err := run(id); err != nil {
		fmt.Printf("An error occurred: %v", err)
		os.Exit(-1)
	}
}

func run(hexWindowID string) error {
	decWindowID, err := strconv.ParseUint(hexWindowID[2:], 16, 32)
	if err != nil {
		return fmt.Errorf("parsing window ID into decimal (input should be hex): %w", err)
	}
	window := xproto.Window(decWindowID)

	x, err := xgbutil.NewConn()
	if err != nil {
		return fmt.Errorf("creating X connection: %w", err)
	}

	prop, err := xprop.GetProperty(x, window, models.SizeHintsPropName)
	if err != nil {
		return fmt.Errorf("getting size hints property: %w", err)
	}

	sizeHints, err := models.ReadXSizeHints(prop.Value)
	if err != nil {
		return fmt.Errorf("reading size hints: %w", err)
	}
	fmt.Printf("Size Hints: %v\nMin Size set: %v\nResize Increment set: %v\nAspect set: %v\n",
		sizeHints,
		sizeHints.IsMinSizeSet(),
		sizeHints.IsResizeIncSet(),
		sizeHints.IsAspectSet())

	sizeHints = sizeHints.
		RemoveMinSize().
		RemoveResizeInc().
		RemoveAspect()

	data, err := sizeHints.Serialise()
	if err != nil {
		return fmt.Errorf("serialising size hints: %w", err)
	}

	if bytes.Equal(data, prop.Value) {
		fmt.Println("Size hints unchanged")
	} else {
		err = xprop.ChangeProp(x, window, prop.Format, models.SizeHintsPropName, "WM_SIZE_HINTS", data)
		if err != nil {
			return fmt.Errorf("changing size hinty property: %w", err)
		}
		fmt.Println("Size hints updated")
	}

	return nil
}
