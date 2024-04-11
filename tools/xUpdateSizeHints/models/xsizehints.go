package models

import (
	"bytes"
	"encoding/binary"
	"fmt"
)

// Ref: https://tronche.com/gui/x/xlib/ICC/client-to-window-manager/wm-normal-hints.html

const SizeHintsPropName = "WM_NORMAL_HINTS"

// Flags
const (
	USPosition  int32 = 1 << 0 // user specified x, y
	USSize      int32 = 1 << 1 // user specified width, height
	PPosition   int32 = 1 << 2 // program specified position
	PSize       int32 = 1 << 3 // program specified size
	PMinSize    int32 = 1 << 4 // program specified minimum size
	PMaxSize    int32 = 1 << 5 // program specified maximum size
	PResizeInc  int32 = 1 << 6 // program specified resize increments
	PAspect     int32 = 1 << 7 // program specified min and max aspect ratios
	PBaseSize   int32 = 1 << 8
	PWinGravity int32 = 1 << 9
)

type XSizeHints struct {
	// Note: The following types assume lengths that will not be portable between all platform architectures & compilers.
	// e.g. flags is long https://gitlab.freedesktop.org/xorg/lib/libx11/-/blob/master/include/X11/Xutil.h?ref_type=heads#L82
	// and on my system that is 32bits, and so are the other int flags, hence int32 here for both types.
	// That's due to the C spec. See https://stackoverflow.com/a/7456920
	flags                int32 /* marks which fields in this structure are defined */
	x, y                 int32 /* Obsolete */
	width, height        int32 /* Obsolete */
	minWidth, minHeight  int32
	maxWidth, maxHeight  int32
	widthInc, heightInc  int32
	minAspect, maxAspect struct {
		numerator   int32 /* numerator */
		denominator int32 /* denominator */
	}
	baseWidth, baseHeight int32
	winGravity            int32
}

func ReadXSizeHints(data []byte) (XSizeHints, error) {
	res := XSizeHints{}
	buf := bytes.NewBuffer(data)
	err := binary.Read(buf, binary.LittleEndian, &res.flags)
	if err != nil {
		return res, fmt.Errorf("reading flags: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.x)
	if err != nil {
		return res, fmt.Errorf("reading x: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.y)
	if err != nil {
		return res, fmt.Errorf("reading y: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.width)
	if err != nil {
		return res, fmt.Errorf("reading width: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.height)
	if err != nil {
		return res, fmt.Errorf("reading height: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.minWidth)
	if err != nil {
		return res, fmt.Errorf("reading minWidth: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.minHeight)
	if err != nil {
		return res, fmt.Errorf("reading minHeight: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.maxWidth)
	if err != nil {
		return res, fmt.Errorf("reading maxWidth: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.maxHeight)
	if err != nil {
		return res, fmt.Errorf("reading maxHeight: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.widthInc)
	if err != nil {
		return res, fmt.Errorf("reading widthInc: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.heightInc)
	if err != nil {
		return res, fmt.Errorf("reading heightInc: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.minAspect.numerator)
	if err != nil {
		return res, fmt.Errorf("reading minAspect.numerator: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.minAspect.denominator)
	if err != nil {
		return res, fmt.Errorf("reading minAspect.denominator: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.maxAspect.numerator)
	if err != nil {
		return res, fmt.Errorf("reading maxAspect.numerator: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.maxAspect.denominator)
	if err != nil {
		return res, fmt.Errorf("reading maxAspect.denominator: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.baseWidth)
	if err != nil {
		return res, fmt.Errorf("reading baseWidth: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.baseHeight)
	if err != nil {
		return res, fmt.Errorf("reading baseHeight: %w", err)
	}
	err = binary.Read(buf, binary.LittleEndian, &res.winGravity)
	if err != nil {
		return res, fmt.Errorf("reading winGravity: %w", err)
	}
	return res, nil
}

func (h XSizeHints) Serialise() ([]byte, error) {
	buf := bytes.NewBuffer(make([]byte, 0, 18*4))
	err := binary.Write(buf, binary.LittleEndian, h.flags)
	if err != nil {
		return nil, fmt.Errorf("writing flags: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.x)
	if err != nil {
		return nil, fmt.Errorf("writing x: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.y)
	if err != nil {
		return nil, fmt.Errorf("writing y: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.width)
	if err != nil {
		return nil, fmt.Errorf("writing width: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.height)
	if err != nil {
		return nil, fmt.Errorf("writing height: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.minWidth)
	if err != nil {
		return nil, fmt.Errorf("writing minWidth: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.minHeight)
	if err != nil {
		return nil, fmt.Errorf("writing minHeight: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.maxWidth)
	if err != nil {
		return nil, fmt.Errorf("writing maxWidth: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.maxHeight)
	if err != nil {
		return nil, fmt.Errorf("writing maxHeight: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.widthInc)
	if err != nil {
		return nil, fmt.Errorf("writing widthInc: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.heightInc)
	if err != nil {
		return nil, fmt.Errorf("writing heightInc: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.minAspect.numerator)
	if err != nil {
		return nil, fmt.Errorf("writing minAspecct.numerator: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.minAspect.denominator)
	if err != nil {
		return nil, fmt.Errorf("writing minAspecct.denominator: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.maxAspect.numerator)
	if err != nil {
		return nil, fmt.Errorf("writing maxAspect.numerator: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.maxAspect.denominator)
	if err != nil {
		return nil, fmt.Errorf("writing maxAspect.denominator: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.baseWidth)
	if err != nil {
		return nil, fmt.Errorf("writing baseWidth: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.baseHeight)
	if err != nil {
		return nil, fmt.Errorf("writing baseHeight: %w", err)
	}
	err = binary.Write(buf, binary.LittleEndian, h.winGravity)
	if err != nil {
		return nil, fmt.Errorf("writing winGravity: %w", err)
	}
	return buf.Bytes(), nil
}

func (h XSizeHints) IsMinSizeSet() bool {
	return h.flags&PMinSize != 0
}

func (h XSizeHints) IsResizeIncSet() bool {
	return h.flags&PResizeInc != 0
}

func (h XSizeHints) IsAspectSet() bool {
	return h.flags&PAspect != 0
}

func (h XSizeHints) RemoveMinSize() XSizeHints {
	h.flags &= ^PMinSize
	return h
}

func (h XSizeHints) RemoveResizeInc() XSizeHints {
	h.flags &= ^PResizeInc
	return h
}

func (h XSizeHints) RemoveAspect() XSizeHints {
	h.flags &= ^PAspect
	return h
}
