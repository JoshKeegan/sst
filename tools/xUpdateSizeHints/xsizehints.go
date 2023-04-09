package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
)

// Ref: https://tronche.com/gui/x/xlib/ICC/client-to-window-manager/wm-normal-hints.html

const SizeHintsPropName = "WM_NORMAL_HINTS"

// Flags
const (
	USPosition  int64 = 1 << 0 // user specified x, y
	USSize      int64 = 1 << 1 // user specified width, height
	PPosition   int64 = 1 << 2 // program specified position
	PSize       int64 = 1 << 3 // program specified size
	PMinSize    int64 = 1 << 4 // program specified minimum size
	PMaxSize    int64 = 1 << 5 // program specified maximum size
	PResizeInc  int64 = 1 << 6 // program specified resize increments
	PAspect     int64 = 1 << 7 // program specified min and max aspect ratios
	PBaseSize   int64 = 1 << 8
	PWinGravity int64 = 1 << 9
)

type XSizeHints struct {
	flags                int64 /* marks which fields in this structure are defined */
	x, y                 int   /* Obsolete */
	width, height        int   /* Obsolete */
	minWidth, minHeight  int
	maxWidth, maxHeight  int
	widthInc, heightInc  int
	minAspect, maxAspect struct {
		numerator   int /* numerator */
		denominator int /* denominator */
	}
	baseWidth, baseHeight int
	winGravity            int
	/* this structure may be extended in the future */
}

func ReadXSizeHints(data []byte) (XSizeHints, error) {
	res := XSizeHints{}
	buf := bytes.NewBuffer(data)
	err := binary.Read(buf, binary.LittleEndian, &res.flags)
	if err != nil {
		return res, fmt.Errorf("reading flags: %w", err)
	}
	// TODO: Read others
	return res, nil
}

func (h XSizeHints) IsAspectSet() bool {
	return h.flags&PAspect != 0
}

func (h XSizeHints) RemoveAspect() XSizeHints {
	h.flags &= ^PAspect
	return h
}
