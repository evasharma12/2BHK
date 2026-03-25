class MapsController {
  static async autocomplete(req, res) {
    try {
      const key = process.env.GOOGLE_MAPS_API_KEY;
      if (!key) {
        return res.status(500).json({
          success: false,
          message: 'Google Maps API key is not configured on backend',
        });
      }

      const input = (req.query.input || '').trim();
      if (!input || input.length < 3) {
        return res.json({ success: true, data: { predictions: [] } });
      }

      const params = new URLSearchParams({
        input,
        key,
        components: 'country:in',
      });

      const googleRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
      );
      const googleData = await googleRes.json();

      if (googleData.status !== 'OK' && googleData.status !== 'ZERO_RESULTS') {
        return res.status(400).json({
          success: false,
          message: googleData.error_message || `Google autocomplete failed: ${googleData.status}`,
        });
      }

      return res.json({
        success: true,
        data: {
          predictions: (googleData.predictions || []).map((p) => ({
            place_id: p.place_id,
            description: p.description,
            structured_formatting: p.structured_formatting || null,
          })),
        },
      });
    } catch (error) {
      console.error('Maps autocomplete error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch address suggestions',
      });
    }
  }

  static async geocode(req, res) {
    try {
      const key = process.env.GOOGLE_MAPS_API_KEY;
      if (!key) {
        return res.status(500).json({
          success: false,
          message: 'Google Maps API key is not configured on backend',
        });
      }

      const placeId = (req.query.place_id || '').trim();
      const address = (req.query.address || '').trim();

      if (!placeId && !address) {
        return res.status(400).json({
          success: false,
          message: 'Either place_id or address is required',
        });
      }

      const params = new URLSearchParams({ key });
      if (placeId) params.set('place_id', placeId);
      else params.set('address', address);

      const googleRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
      );
      const googleData = await googleRes.json();

      if (googleData.status !== 'OK') {
        return res.status(400).json({
          success: false,
          message: googleData.error_message || `Google geocode failed: ${googleData.status}`,
        });
      }

      const result = googleData.results && googleData.results[0];
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'No geocode result found for this address',
        });
      }

      return res.json({
        success: true,
        data: {
          place_id: result.place_id,
          formatted_address: result.formatted_address,
          location: result.geometry?.location || null,
          address_components: result.address_components || [],
        },
      });
    } catch (error) {
      console.error('Maps geocode error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to geocode address',
      });
    }
  }
}

module.exports = MapsController;
