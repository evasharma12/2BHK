const path = require('path');
const fs = require('fs');
const Property = require('../models/property.model');
const User = require('../models/user.model');
const { isConfigured: cloudinaryConfigured, uploadStream: cloudinaryUpload } = require('../config/cloudinary');

const uploadsDir = path.join(__dirname, '../uploads/properties');

class PropertyController {
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
        'address',
        'locality',
        'city',
        'pincode',
        'built_up_area',
        'carpet_area',
        'total_floors',
        'floor_number',
        'property_age',
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

      const propertyData = {
        owner_id: ownerId,
        property_for: body.property_for,
        property_type: body.property_type,
        bhk_type: body.bhk_type,
        address: body.address,
        locality: body.locality,
        city: body.city,
        state: body.state || null,
        pincode: body.pincode,
        built_up_area: body.built_up_area,
        carpet_area: body.carpet_area,
        total_floors: body.total_floors,
        floor_number: body.floor_number,
        bedrooms: body.bedrooms || null,
        bathrooms: body.bathrooms || null,
        balconies: body.balconies || 0,
        property_age: body.property_age,
        furnishing: body.furnishing,
        facing: body.facing || null,
        expected_price: body.expected_price,
        price_negotiable: body.price_negotiable || false,
        maintenance_charges: body.maintenance_charges || null,
        security_deposit: body.security_deposit || null,
        description: body.description || null,
        available_from: body.available_from || null,
      };

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
      return res.status(500).json({
        success: false,
        message: 'Failed to create property',
      });
    }
  }

  static async getAllProperties(req, res) {
    try {
      const q = req.query || {};
      const filters = {
        property_for: q.property_for || undefined,
        bhk_type: q.bhk_type || undefined,
        property_type: q.property_type || undefined,
        furnishing: q.furnishing || undefined,
        min_price: q.min_price !== undefined && q.min_price !== '' ? q.min_price : undefined,
        max_price: q.max_price !== undefined && q.max_price !== '' ? q.max_price : undefined,
        location: q.location || undefined,
        city: q.city || undefined,
        locality: q.locality || undefined,
        sort: q.sort || 'newest',
      };
      const properties = await Property.findAllWithFilters(filters);
      return res.json({
        success: true,
        data: properties,
      });
    } catch (error) {
      console.error('Get properties error:', error);
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
      const affectedRows = await Property.deleteById(propertyId, userId);
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
        'address',
        'locality',
        'city',
        'pincode',
        'built_up_area',
        'carpet_area',
        'total_floors',
        'floor_number',
        'property_age',
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
      const updateData = {
        property_for: body.property_for,
        property_type: body.property_type,
        bhk_type: body.bhk_type,
        address: body.address,
        locality: body.locality,
        city: body.city,
        state: body.state || null,
        pincode: body.pincode,
        built_up_area: body.built_up_area,
        carpet_area: body.carpet_area,
        total_floors: body.total_floors,
        floor_number: body.floor_number,
        bedrooms: body.bedrooms || null,
        bathrooms: body.bathrooms || null,
        balconies: body.balconies != null ? body.balconies : 0,
        property_age: body.property_age,
        furnishing: body.furnishing,
        facing: body.facing || null,
        expected_price: body.expected_price,
        price_negotiable: body.price_negotiable || false,
        maintenance_charges: body.maintenance_charges || null,
        security_deposit: body.security_deposit || null,
        description: body.description || null,
        available_from: body.available_from || null,
      };
      if (body.amenities && Array.isArray(body.amenities)) {
        updateData.amenities = body.amenities;
      }
      if (body.image_urls && Array.isArray(body.image_urls)) {
        updateData.image_urls = body.image_urls;
      }
      const affectedRows = await Property.update(propertyId, userId, updateData);
      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Property not found or you do not have permission to edit it',
        });
      }
      return res.json({
        success: true,
        message: 'Property updated successfully',
        data: { property_id: propertyId },
      });
    } catch (error) {
      console.error('Update property error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update property',
      });
    }
  }
}

module.exports = PropertyController;

