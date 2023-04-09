package main

import (
	"bytes"
	"encoding/binary"
	"flag"
	"fmt"
	"os"
	"strconv"

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

	prop, err := xprop.GetProperty(x, window, SizeHintsPropName)
	if err != nil {
		return fmt.Errorf("getting size hints property: %w", err)
	}
	fmt.Printf("%v\n", prop.Value)

	sizeHints, err := ReadXSizeHints(prop.Value)
	if err != nil {
		return fmt.Errorf("reading size hints: %w", err)
	}
	fmt.Printf("Size Hints: %v\nAspect set: %v\n", sizeHints, sizeHints.IsAspectSet())

	if sizeHints.IsAspectSet() {
		sizeHints = sizeHints.RemoveAspect()
		fmt.Println("Removed aspect...")

		// TODO: If all props are writeable then a method should be on XSizeHints to generate bytes
		// This code is just updating the flags to disable aspect ratio
		buf := bytes.NewBuffer(make([]byte, 0))
		err = binary.Write(buf, binary.LittleEndian, sizeHints.flags)
		if err != nil {
			return fmt.Errorf("writing flags: %w", err)
		}
		err = binary.Write(buf, binary.LittleEndian, prop.Value[8:])
		if err != nil {
			return fmt.Errorf("writing size hints body: %w", err)
		}
		changed := buf.Bytes()

		err = xprop.ChangeProp(x, window, prop.Format, SizeHintsPropName, "WM_SIZE_HINTS", changed)
		if err != nil {
			return fmt.Errorf("changing size hinty property: %w", err)
		}
		fmt.Println("Updated size hints")
	}

	return nil
}
