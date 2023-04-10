package models_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"xUpdateSizeHints/models"
)

func TestXSizeHints_RoundTrip(t *testing.T) {
	sizeHints, err := models.ReadXSizeHints(createSample())
	require.NoError(t, err)

	actual, err := sizeHints.Serialise()
	require.NoError(t, err)

	assert.Equal(t, createSample(), actual)
}

func createSample() []byte {
	return []byte{
		48, 3, 0, 0,
		0, 0, 0, 0,
		0, 0, 0, 0,
		0, 0, 0, 0,
		0, 0, 0, 0,
		160, 0, 0, 0,
		80, 0, 0, 0,
		0, 64, 0, 0,
		0, 64, 0, 0,
		0, 0, 0, 0,
		0, 0, 0, 0,
		0, 0, 1, 0,
		0, 128, 0, 0,
		0, 0, 1, 0,
		0, 128, 0, 0,
		160, 0, 0, 0,
		80, 0, 0, 0,
		1, 0, 0, 0}
}
