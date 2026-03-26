const GOOGLE_TIMEOUT_MS = 7000;

function withTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
}

function mapGoogleStatusToHttpStatus(googleStatus) {
  switch (googleStatus) {
    case 'ZERO_RESULTS':
      return 200;
    case 'INVALID_REQUEST':
      return 400;
    case 'REQUEST_DENIED':
      return 502;
    case 'OVER_QUERY_LIMIT':
      return 429;
    case 'UNKNOWN_ERROR':
      return 503;
    default:
      return 502;
  }
}

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

      const googleRes = await withTimeout(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
        ,
        GOOGLE_TIMEOUT_MS
      );
      const googleData = await googleRes.json();

      if (googleData.status !== 'OK' && googleData.status !== 'ZERO_RESULTS') {
        return res.status(mapGoogleStatusToHttpStatus(googleData.status)).json({
          success: false,
          message:
            googleData.error_message ||
            `Google autocomplete unavailable (${googleData.status}). Try entering location text manually.`,
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
      if (error?.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          message: 'Address suggestions timed out. Please try again or continue with manual location text.',
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch address suggestions. Please try again.',
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

      const googleRes = await withTimeout(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
        ,
        GOOGLE_TIMEOUT_MS
      );
      const googleData = await googleRes.json();

      if (googleData.status !== 'OK') {
        return res.status(mapGoogleStatusToHttpStatus(googleData.status)).json({
          success: false,
          message:
            googleData.error_message ||
            `Geocoding unavailable (${googleData.status}). You can still search by location text without map precision.`,
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
      if (error?.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          message: 'Address lookup timed out. Please try again or continue with manual location text.',
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to geocode address. Please try again.',
      });
    }
  }
}

module.exports = MapsController;
