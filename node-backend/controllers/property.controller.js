const path = require('path');
const fs = require('fs');
const db = require('../storage/dbConnection');
const Property = require('../models/property.model');
const AdminUser = require('../models/adminUser.model');
const User = require('../models/user.model');
const { isConfigured: cloudinaryConfigured, uploadStream: cloudinaryUpload } = require('../config/cloudinary');

const uploadsDir = path.join(__dirname, '../uploads/properties');

function normalizePhoneInput(phone) {
  if (phone === undefined || phone === null) return '';
  return String(phone).trim().replace(/\D/g, '');
}

function isValidPhoneInput(phone) {
  // Accept:
  // - 10 digits (e.g., 9876543210)
  // - 91 + 10 digits (e.g., 919876543210)
  // - optional leading + (e.g., +919876543210)
  const normalized = phone.startsWith('+') ? phone.slice(1) : phone;
  return /^\d{10}$/.test(normalized) || /^91\d{10}$/.test(normalized);
}

function normalizeSecondaryPhoneInput(phone) {
  if (phone === undefined || phone === null) return null;
  const trimmed = String(phone).trim();
  if (!trimmed) return null;
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!isValidPhoneInput(digitsOnly)) {
    throw new Error('Invalid secondary mobile number. Please enter a valid Indian mobile number.');
  }
  return digitsOnly.length === 12 && digitsOnly.startsWith('91')
    ? digitsOnly.slice(2)
    : digitsOnly;
}

function upsertPrimaryPhone(userId, phone_number) {
  const rawPhone = normalizePhoneInput(phone_number);
  if (!rawPhone) return Promise.resolve();
  if (!isValidPhoneInput(rawPhone)) {
    return Promise.reject(new Error('Invalid mobile number. Please enter a valid Indian mobile number.'));
  }
  const phone = rawPhone.length === 12 && rawPhone.startsWith('91') ? rawPhone.slice(2) : rawPhone;

  // Keep this behavior consistent with `UserController.updatePhone`:
  // update the existing primary phone (if any), otherwise insert a new primary phone.
  return new Promise((resolve, reject) => {
    const selectSql = `
      SELECT phone_id, phone_number, is_verified
      FROM user_phones
      WHERE user_id = ? AND is_primary = 1
      LIMIT 1
    `;

    db.query(selectSql, [userId], (selectErr, results) => {
      if (selectErr) {
        console.error('Select phone error:', selectErr);
        return reject(selectErr);
      }

      if (results.length > 0) {
        const phoneId = results[0].phone_id;
        const existingPhone = normalizePhoneInput(results[0].phone_number);
        const existing10 =
          existingPhone.length === 12 && existingPhone.startsWith('91')
            ? existingPhone.slice(2)
            : existingPhone;
        const keepVerified = existing10 === phone && !!results[0].is_verified;
        const updateSql = `
          UPDATE user_phones
          SET phone_number = ?, is_verified = ?
          WHERE phone_id = ?
        `;
        db.query(updateSql, [phone, keepVerified ? 1 : 0, phoneId], (updateErr) => {
          if (updateErr) {
            console.error('Update phone error:', updateErr);
            return reject(updateErr);
          }
          return resolve();
        });
      } else {
        const insertSql = `
          INSERT INTO user_phones (user_id, phone_number, is_primary, is_verified)
          VALUES (?, ?, 1, 0)
        `;
        db.query(insertSql, [userId, phone], (insertErr) => {
          if (insertErr) {
            console.error('Insert phone error:', insertErr);
            return reject(insertErr);
          }
          return resolve();
        });
      }
    });
  });
}

function parseAndValidateCoordinates(body) {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Latitude and longitude are required and must be numbers');
  }
  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }

  return { latitude, longitude };
}

function parseRadiusSearchQuery(query) {
  const latRaw = query.lat;
  const lngRaw = query.lng;

  if (
    (latRaw === undefined || latRaw === '') &&
    (lngRaw === undefined || lngRaw === '')
  ) {
    return null;
  }

  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  const radiusRaw = query.radius_km;
  const radius_km =
    radiusRaw === undefined || radiusRaw === '' ? 10 : Number(radiusRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('lat and lng must be valid numbers');
  }
  if (lat < -90 || lat > 90) {
    throw new Error('lat must be between -90 and 90');
  }
  if (lng < -180 || lng > 180) {
    throw new Error('lng must be between -180 and 180');
  }
  if (!Number.isFinite(radius_km) || radius_km <= 0) {
    throw new Error('radius_km must be a positive number');
  }

  return { lat, lng, radius_km };
}

class PropertyController {
  static parseRentedViaHimHomesInput(value) {
    if (value === true || value === false) return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'yes' || normalized === 'true') return true;
      if (normalized === 'no' || normalized === 'false') return false;
    }
    return null;
  }

  static async createProperty(req, res) {
    try {
      const ownerId = req.user.user_id;
      const body = req.body;

      if (!ownerId) {
        return res.status(400).json({
          success: false,
          message: 'Owner ID is missing from token',
        });
      }

      // When a renter or buyer posts a property, upgrade their user_type to 'both' so the listing succeeds
      const user = await User.findById(ownerId);
      if (user && (user.user_type === 'renter' || user.user_type === 'buyer')) {
        await User.updateUserType(ownerId, 'both');
      }

      const requiredFields = [
        'property_for',
        'property_type',
        'bhk_type',
        'locality',
        'city',
        'pincode',
        'built_up_area',
        'carpet_area',
        'total_floors',
        'floor_number',
        'furnishing',
        'expected_price',
      ];

      for (const field of requiredFields) {
        if (!body[field]) {
          return res.status(400).json({
            success: false,
            message: `Missing required field: ${field}`,
          });
        }
      }

      const mobileNo = body.mobile_no || body.mobileNo;
      const secondaryPhoneNumber = normalizeSecondaryPhoneInput(
        body.secondary_phone_number ?? body.secondaryPhoneNumber
      );
      const { latitude, longitude } = parseAndValidateCoordinates(body);

      const propertyData = {
        owner_id: ownerId,
        property_for: body.property_for,
        property_type: body.property_type,
        bhk_type: body.bhk_type,
        address_text: body.address_text,
        locality: body.locality,
        city: body.city,
        state: body.state || null,
        pincode: body.pincode,
        latitude,
        longitude,
        built_up_area: body.built_up_area,
        carpet_area: body.carpet_area,
        total_floors: body.total_floors,
        floor_number: body.floor_number,
        bedrooms: body.bedrooms || null,
        bathrooms: body.bathrooms || null,
        balconies: body.balconies || 0,
        // DB schema requires property_age; default when omitted from optional UI.
        property_age: body.property_age || '1-3',
        furnishing: body.furnishing,
        facing: body.facing || null,
        expected_price: body.expected_price,
        price_negotiable: body.price_negotiable || false,
        maintenance_charges: body.maintenance_charges || null,
        security_deposit: body.security_deposit || null,
        description: body.description || null,
        available_from: body.available_from || null,
        secondary_phone_number: secondaryPhoneNumber,
      };

      if (mobileNo) {
        await upsertPrimaryPhone(ownerId, mobileNo);
      }

      const propertyId = await Property.create(propertyData);

      if (body.amenities && Array.isArray(body.amenities) && body.amenities.length > 0) {
        await Property.addAmenities(propertyId, body.amenities);
      }
      if (body.image_urls && Array.isArray(body.image_urls) && body.image_urls.length > 0) {
        await Property.addImages(propertyId, body.image_urls);
      }

      return res.status(201).json({
        success: true,
        message: 'Property created successfully',
        data: {
          property_id: propertyId,
        },
      });
    } catch (error) {
      console.error('Create property error:', error);
      if (
        error?.message?.includes('Invalid mobile number') ||
        error?.message?.includes('Invalid secondary mobile number') ||
        error?.message?.includes('Latitude') ||
        error?.message?.includes('longitude')
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to create property',
      });
    }
  }

  static async getAllProperties(req, res) {
    try {
      const q = req.query || {};
      const radiusSearch = parseRadiusSearchQuery(q);
      const filters = {
        property_for: q.property_for || undefined,
        bhk_type: q.bhk_type || undefined,
        property_type: q.property_type || undefined,
        furnishing: q.furnishing || undefined,
        min_price: q.min_price !== undefined && q.min_price !== '' ? q.min_price : undefined,
        max_price: q.max_price !== undefined && q.max_price !== '' ? q.max_price : undefined,
        city: q.city || undefined,
        locality: q.locality || undefined,
        sort: q.sort || 'newest',
        lat: radiusSearch?.lat,
        lng: radiusSearch?.lng,
        radius_km: radiusSearch?.radius_km,
      };
      const properties = await Property.findAllWithFilters(filters);
      return res.json({
        success: true,
        data: properties,
      });
    } catch (error) {
      console.error('Get properties error:', error);
      if (
        error?.message?.includes('lat') ||
        error?.message?.includes('lng') ||
        error?.message?.includes('radius_km')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch properties',
      });
    }
  }

  static async getMyListings(req, res) {
    try {
      const ownerId = req.user?.user_id;
      if (!ownerId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }
      const properties = await Property.findByOwnerId(ownerId);
      return res.json({
        success: true,
        data: properties,
      });
    } catch (error) {
      console.error('Get my listings error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch your listings',
      });
    }
  }

  static async uploadImages(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No images uploaded',
        });
      }

      // Multer uses memory storage, so we always have buffers
      const files = req.files;
      let urls = [];

      if (cloudinaryConfigured()) {
        try {
          for (const file of files) {
            const secureUrl = await cloudinaryUpload(
              file.buffer,
              'properties',
              file.originalname || 'image'
            );
            urls.push(secureUrl);
          }
          console.log('Upload: using Cloudinary,', urls.length, 'image(s)');
        } catch (cloudErr) {
          console.error('Cloudinary upload failed:', cloudErr.message);
          return res.status(500).json({
            success: false,
            message: 'Image upload to cloud failed. Check CLOUDINARY_* in .env (use cloud name from dashboard, not your name).',
          });
        }
      } else {
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
        for (const file of files) {
          const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
          const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
          const filepath = path.join(uploadsDir, filename);
          fs.writeFileSync(filepath, file.buffer);
          urls.push(`${baseUrl}/uploads/properties/${filename}`);
        }
        console.log('Upload: using local storage,', urls.length, 'image(s)');
      }

      return res.json({
        success: true,
        data: { urls },
      });
    } catch (error) {
      console.error('Upload images error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload images',
      });
    }
  }

  static async getPropertyById(req, res) {
    try {
      const propertyId = req.params.id;
      const property = await Property.findById(propertyId);
      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'Property not found',
        });
      }
      return res.json({
        success: true,
        data: property,
      });
    } catch (error) {
      console.error('Get property by id error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch property',
      });
    }
  }

  static async deleteProperty(req, res) {
    try {
      const propertyId = req.params.id;
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const rentedViaHimHomes = PropertyController.parseRentedViaHimHomesInput(
        req.body?.rented_via_himhomes
      );
      if (rentedViaHimHomes === null) {
        return res.status(400).json({
          success: false,
          message: 'Please provide rented_via_himhomes as yes/no.',
        });
      }

      const affectedRows = await Property.deleteById(propertyId, userId, rentedViaHimHomes);
      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Property not found or you do not have permission to delete it',
        });
      }
      return res.json({
        success: true,
        message: 'Property deleted successfully',
      });
    } catch (error) {
      console.error('Delete property error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete property',
      });
    }
  }

  static async updateProperty(req, res) {
    try {
      const propertyId = req.params.id;
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }
      const body = req.body;
      const requiredFields = [
        'property_for',
        'property_type',
        'bhk_type',
        'locality',
        'city',
        'pincode',
        'built_up_area',
        'carpet_area',
        'total_floors',
        'floor_number',
        'furnishing',
        'expected_price',
      ];
      for (const field of requiredFields) {
        if (!body[field]) {
          return res.status(400).json({
            success: false,
            message: `Missing required field: ${field}`,
          });
        }
      }

      const mobileNo = body.mobile_no || body.mobileNo;
      const secondaryPhoneNumber = normalizeSecondaryPhoneInput(
        body.secondary_phone_number ?? body.secondaryPhoneNumber
      );
      const { latitude, longitude } = parseAndValidateCoordinates(body);

      const updateData = {
        property_for: body.property_for,
        property_type: body.property_type,
        bhk_type: body.bhk_type,
        address_text: body.address_text,
        locality: body.locality,
        city: body.city,
        state: body.state || null,
        pincode: body.pincode,
        latitude,
        longitude,
        built_up_area: body.built_up_area,
        carpet_area: body.carpet_area,
        total_floors: body.total_floors,
        floor_number: body.floor_number,
        bedrooms: body.bedrooms || null,
        bathrooms: body.bathrooms || null,
        balconies: body.balconies != null ? body.balconies : 0,
        // DB schema requires property_age; default when omitted from optional UI.
        property_age: body.property_age || '1-3',
        furnishing: body.furnishing,
        facing: body.facing || null,
        expected_price: body.expected_price,
        price_negotiable: body.price_negotiable || false,
        maintenance_charges: body.maintenance_charges || null,
        security_deposit: body.security_deposit || null,
        description: body.description || null,
        available_from: body.available_from || null,
        secondary_phone_number: secondaryPhoneNumber,
      };
      if (body.amenities && Array.isArray(body.amenities)) {
        updateData.amenities = body.amenities;
      }
      if (body.image_urls && Array.isArray(body.image_urls)) {
        updateData.image_urls = body.image_urls;
      }
      const isAdmin = await AdminUser.isActiveAdmin(userId);
      const affectedRows = await Property.update(propertyId, userId, updateData, {
        allowCrossOwnerEdit: isAdmin,
      });
      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Property not found or you do not have permission to edit it',
        });
      }

      if (mobileNo) {
        await upsertPrimaryPhone(userId, mobileNo);
      }

      return res.json({
        success: true,
        message: 'Property updated successfully',
        data: { property_id: propertyId },
      });
    } catch (error) {
      console.error('Update property error:', error);
      if (
        error?.message?.includes('Invalid mobile number') ||
        error?.message?.includes('Invalid secondary mobile number') ||
        error?.message?.includes('Latitude') ||
        error?.message?.includes('longitude')
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to update property',
      });
    }
  }
}

module.exports = PropertyController;

