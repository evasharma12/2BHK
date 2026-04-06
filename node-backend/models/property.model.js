const db = require('../storage/dbConnection');

const Property = {
  // Create a new property
  async create(propertyData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO properties (
          owner_id,
          property_for,
          property_type,
          bhk_type,
          address_text,
          locality,
          city,
          state,
          pincode,
          location,
          built_up_area,
          carpet_area,
          total_floors,
          floor_number,
          bedrooms,
          bathrooms,
          balconies,
          property_age,
          furnishing,
          facing,
          expected_price,
          price_negotiable,
          maintenance_charges,
          security_deposit,
          description,
          available_from
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ST_SRID(POINT(?, ?), 4326), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `;

      const {
        owner_id,
        property_for,
        property_type,
        bhk_type,
        address_text,
        locality,
        city,
        state,
        pincode,
        latitude,
        longitude,
        built_up_area,
        carpet_area,
        total_floors,
        floor_number,
        bedrooms,
        bathrooms,
        balconies,
        property_age,
        furnishing,
        facing,
        expected_price,
        price_negotiable,
        maintenance_charges,
        security_deposit,
        description,
        available_from,
      } = propertyData;

      db.query(
        sql,
        [
          owner_id,
          property_for,
          property_type,
          bhk_type,
          address_text,
          locality,
          city,
          state || null,
          pincode,
          longitude,
          latitude,
          built_up_area,
          carpet_area,
          total_floors,
          floor_number,
          bedrooms || null,
          bathrooms || null,
          balconies || 0,
          property_age,
          furnishing,
          facing || null,
          expected_price,
          price_negotiable ? 1 : 0,
          maintenance_charges || null,
          security_deposit || null,
          description || null,
          available_from || null,
        ],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.insertId);
        }
      );
    });
  },

  // Get all active properties (basic list, with first image for card)
  async findAll() {
    return this.findAllWithFilters({});
  },

  // Get active properties with optional filters (query params from frontend)
  async findAllWithFilters(filters) {
    return new Promise((resolve, reject) => {
      const conditions = ['p.status = ?'];
      const values = ['active'];
      let distanceExpr = 'NULL';
      let usingRadiusSearch = false;

      if (filters.property_for) {
        conditions.push('p.property_for = ?');
        values.push(filters.property_for);
      }
      if (filters.bhk_type) {
        conditions.push('p.bhk_type = ?');
        values.push(filters.bhk_type);
      }
      if (filters.property_type) {
        conditions.push('p.property_type = ?');
        values.push(filters.property_type);
      }
      if (filters.furnishing) {
        conditions.push('p.furnishing = ?');
        values.push(filters.furnishing);
      }
      if (filters.min_price != null && filters.min_price !== '') {
        conditions.push('p.expected_price >= ?');
        values.push(Number(filters.min_price));
      }
      if (filters.max_price != null && filters.max_price !== '') {
        conditions.push('p.expected_price <= ?');
        values.push(Number(filters.max_price));
      }
      if (filters.city) {
        conditions.push('p.city = ?');
        values.push(filters.city);
      }
      if (filters.locality) {
        conditions.push('p.locality LIKE ?');
        values.push(`%${filters.locality}%`);
      }

      if (filters.lat != null && filters.lng != null) {
        const lat = Number(filters.lat);
        const lng = Number(filters.lng);
        const radiusKm = Number(filters.radius_km || 10);
        const kmPerLatDegree = 111.32;
        const latDelta = radiusKm / kmPerLatDegree;
        const safeCosLat = Math.max(Math.abs(Math.cos((lat * Math.PI) / 180)), 0.000001);
        const lngDelta = radiusKm / (kmPerLatDegree * safeCosLat);
        const minLat = lat - latDelta;
        const maxLat = lat + latDelta;
        const minLng = lng - lngDelta;
        const maxLng = lng + lngDelta;
        const radiusMeters = radiusKm * 1000;

        distanceExpr = 'ST_Distance_Sphere(p.location, ST_SRID(POINT(?, ?), 4326)) / 1000';

        // Bounding box limits candidate rows so spatial distance check stays efficient.
        conditions.push('MBRContains(ST_SRID(LineString(POINT(?, ?), POINT(?, ?)), 4326), p.location)');
        values.push(minLng, minLat, maxLng, maxLat);

        // Exact radius filter after bounding box prefilter.
        conditions.push('ST_Distance_Sphere(p.location, ST_SRID(POINT(?, ?), 4326)) <= ?');
        values.push(lng, lat, radiusMeters);
        usingRadiusSearch = true;
      }

      const orderBy = {
        newest: 'p.created_at DESC',
        price_asc: 'p.expected_price ASC',
        price_desc: 'p.expected_price DESC',
        area_desc: 'p.built_up_area DESC',
      };
      const sort =
        filters.sort && orderBy[filters.sort]
          ? orderBy[filters.sort]
          : (usingRadiusSearch ? 'distance_km ASC' : orderBy.newest);

      const whereClause = conditions.join(' AND ');
      const sql = `
        SELECT 
          p.property_id,
          p.owner_id,
          p.property_for,
          p.property_type,
          p.bhk_type,
          p.address_text,
          p.locality,
          p.city,
          ST_Y(p.location) AS lat,
          ST_X(p.location) AS lng,
          ${distanceExpr} AS distance_km,
          p.expected_price,
          p.built_up_area,
          p.carpet_area,
          p.furnishing,
          p.status,
          p.created_at,
          (SELECT pi.image_url FROM property_images pi WHERE pi.property_id = p.property_id ORDER BY pi.image_order ASC, pi.image_id ASC LIMIT 1) AS cover_image
        FROM properties p
        WHERE ${whereClause}
        ORDER BY ${sort}
      `;

      const queryValues = usingRadiusSearch
        ? [filters.lng, filters.lat, ...values]
        : values;

      db.query(sql, queryValues, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  },

  // Delete a property (only if owned by ownerId) and log owner feedback. Returns affected row count.
  async deleteById(propertyId, ownerId, rentedViaHimHomes) {
    return new Promise((resolve, reject) => {
      db.getConnection((connErr, conn) => {
        if (connErr) return reject(connErr);

        conn.beginTransaction((txErr) => {
          if (txErr) {
            conn.release();
            return reject(txErr);
          }

          conn.query(
            `
              SELECT property_id, property_for, property_type, city, locality
              FROM properties
              WHERE property_id = ? AND owner_id = ?
              LIMIT 1
            `,
            [propertyId, ownerId],
            (findErr, rows) => {
              if (findErr) {
                return conn.rollback(() => {
                  conn.release();
                  reject(findErr);
                });
              }

              if (!rows || rows.length === 0) {
                return conn.rollback(() => {
                  conn.release();
                  resolve(0);
                });
              }

              const property = rows[0];

              conn.query(
                `
                  INSERT INTO property_deletion_feedback (
                    property_id,
                    owner_id,
                    rented_via_himhomes,
                    property_for,
                    property_type,
                    city,
                    locality
                  )
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                  property.property_id,
                  ownerId,
                  rentedViaHimHomes ? 1 : 0,
                  property.property_for,
                  property.property_type,
                  property.city,
                  property.locality,
                ],
                (insertErr) => {
                  if (insertErr) {
                    return conn.rollback(() => {
                      conn.release();
                      reject(insertErr);
                    });
                  }

                  conn.query(
                    'DELETE FROM properties WHERE property_id = ? AND owner_id = ?',
                    [propertyId, ownerId],
                    (deleteErr, deleteResult) => {
                      if (deleteErr) {
                        return conn.rollback(() => {
                          conn.release();
                          reject(deleteErr);
                        });
                      }

                      conn.commit((commitErr) => {
                        if (commitErr) {
                          return conn.rollback(() => {
                            conn.release();
                            reject(commitErr);
                          });
                        }
                        conn.release();
                        resolve(deleteResult.affectedRows);
                      });
                    }
                  );
                }
              );
            }
          );
        });
      });
    });
  },

  // Get properties listed by an owner (basic fields for profile "Listed Properties")
  async findByOwnerId(ownerId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          p.property_id,
          p.property_for,
          p.property_type,
          p.bhk_type,
          p.locality,
          p.city,
          ST_Y(p.location) AS lat,
          ST_X(p.location) AS lng,
          p.expected_price,
          p.created_at
        FROM properties p
        WHERE p.owner_id = ?
        ORDER BY p.created_at DESC
      `;
      db.query(sql, [ownerId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  },

  // Get amenity_id by slug; insert if not exists (returns id)
  async getOrCreateAmenityBySlug(slug) {
    const name = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return new Promise((resolve, reject) => {
      db.query('SELECT amenity_id FROM amenities WHERE amenity_slug = ? LIMIT 1', [slug], (err, rows) => {
        if (err) return reject(err);
        if (rows.length > 0) return resolve(rows[0].amenity_id);
        db.query(
          'INSERT INTO amenities (amenity_name, amenity_slug) VALUES (?, ?)',
          [name, slug],
          (insErr, result) => {
            if (insErr) return reject(insErr);
            resolve(result.insertId);
          }
        );
      });
    });
  },

  // Link property to amenities by slug array
  async addAmenities(propertyId, slugs) {
    if (!slugs || !Array.isArray(slugs) || slugs.length === 0) return;
    for (const slug of slugs) {
      const amenityId = await this.getOrCreateAmenityBySlug(slug);
      await new Promise((resolve, reject) => {
        db.query(
          'INSERT IGNORE INTO property_amenities (property_id, amenity_id) VALUES (?, ?)',
          [propertyId, amenityId],
          (err) => (err ? reject(err) : resolve())
        );
      });
    }
  },

  // Insert image URLs for a property (first = cover, order by index)
  async addImages(propertyId, imageUrls) {
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) return;
    for (let i = 0; i < imageUrls.length; i++) {
      await new Promise((resolve, reject) => {
        db.query(
          'INSERT INTO property_images (property_id, image_url, image_order, is_cover) VALUES (?, ?, ?, ?)',
          [propertyId, imageUrls[i], i, i === 0 ? 1 : 0],
          (err) => (err ? reject(err) : resolve())
        );
      });
    }
  },

  async deleteImagesForProperty(propertyId) {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM property_images WHERE property_id = ?', [propertyId], (err) =>
        err ? reject(err) : resolve()
      );
    });
  },

  async deleteAmenitiesForProperty(propertyId) {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM property_amenities WHERE property_id = ?', [propertyId], (err) =>
        err ? reject(err) : resolve()
      );
    });
  },

  async update(propertyId, ownerId, updateData) {
    const allowed = [
      'property_for', 'property_type', 'bhk_type', 'locality', 'city', 'state', 'pincode',
      'address_text',
      'built_up_area', 'carpet_area', 'total_floors', 'floor_number', 'bedrooms', 'bathrooms', 'balconies',
      'property_age', 'furnishing', 'facing', 'expected_price', 'price_negotiable', 'maintenance_charges',
      'security_deposit', 'description', 'available_from',
    ];
    const setParts = [];
    const values = [];
    const hasCoordinates = updateData.latitude !== undefined || updateData.longitude !== undefined;
    if (hasCoordinates && (updateData.latitude === undefined || updateData.longitude === undefined)) {
      throw new Error('Both latitude and longitude are required to update location');
    }
    for (const key of allowed) {
      if (updateData[key] !== undefined) {
        setParts.push(`${key} = ?`);
        let val = updateData[key];
        if (key === 'price_negotiable') val = val ? 1 : 0;
        if (key === 'balconies' && (val === undefined || val === null)) val = 0;
        values.push(val);
      }
    }
    if (hasCoordinates) {
      setParts.push('location = ST_SRID(POINT(?, ?), 4326)');
      values.push(updateData.longitude, updateData.latitude);
    }
    if (setParts.length === 0 && !updateData.image_urls && !updateData.amenities) {
      return 0;
    }
    let affectedRows = 0;
    if (setParts.length > 0) {
      const result = await new Promise((resolve, reject) => {
        db.query(
          `UPDATE properties SET ${setParts.join(', ')} WHERE property_id = ? AND owner_id = ?`,
          [...values, propertyId, ownerId],
          (err, result) => (err ? reject(err) : resolve(result))
        );
      });
      affectedRows = result.affectedRows;
    } else {
      const row = await new Promise((resolve, reject) => {
        db.query(
          'SELECT 1 FROM properties WHERE property_id = ? AND owner_id = ? LIMIT 1',
          [propertyId, ownerId],
          (err, rows) => (err ? reject(err) : resolve(rows && rows.length ? 1 : 0))
        );
      });
      if (row) affectedRows = 1;
    }

    // Only modify images/amenities after ownership is verified (affectedRows === 1)
    if (affectedRows !== 1) {
      return affectedRows;
    }
    if (updateData.image_urls !== undefined && Array.isArray(updateData.image_urls)) {
      await this.deleteImagesForProperty(propertyId);
      if (updateData.image_urls.length > 0) {
        await this.addImages(propertyId, updateData.image_urls);
      }
    }
    if (updateData.amenities !== undefined && Array.isArray(updateData.amenities)) {
      await this.deleteAmenitiesForProperty(propertyId);
      if (updateData.amenities.length > 0) {
        await this.addAmenities(propertyId, updateData.amenities);
      }
    }
    return affectedRows;
  },

  // Get single property by id with images, amenities, and owner info
  async findById(propertyId) {
    const property = await new Promise((resolve, reject) => {
      const sql = `
        SELECT p.*,
          ST_Y(p.location) AS lat,
          ST_X(p.location) AS lng,
          u.full_name AS owner_name,
          u.email AS owner_email
        FROM properties p
        LEFT JOIN users u ON p.owner_id = u.user_id
        WHERE p.property_id = ? AND p.status = 'active'
        LIMIT 1
      `;
      db.query(sql, [propertyId], (err, results) => {
        if (err) return reject(err);
        resolve(results[0] || null);
      });
    });
    if (!property) return null;

    const images = await new Promise((resolve, reject) => {
      db.query(
        'SELECT image_url FROM property_images WHERE property_id = ? ORDER BY image_order ASC, image_id ASC',
        [propertyId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows.map((r) => r.image_url));
        }
      );
    });

    const amenities = await new Promise((resolve, reject) => {
      const amenitySql = [
        'SELECT a.amenity_slug FROM property_amenities pa',
        'JOIN amenities a ON pa.amenity_id = a.amenity_id',
        'WHERE pa.property_id = ?'
      ].join(' ');
      db.query(amenitySql, [propertyId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(function (r) { return r.amenity_slug; }));
      });
    });

    const ownerPhone = await new Promise(function (resolve, reject) {
      function onPhoneResult(err, rows) {
        if (err) return reject(err);
        resolve(rows.length ? rows[0].phone_number : null);
      }
      db.query(
        'SELECT phone_number FROM user_phones WHERE user_id = ? AND is_primary = 1 LIMIT 1',
        [property.owner_id],
        onPhoneResult
      );
    });

    return Object.assign({}, property, {
      images: images,
      amenities: amenities,
      owner_phone: ownerPhone
    });
  }
};

module.exports = Property;

