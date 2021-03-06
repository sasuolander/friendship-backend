import knex from '../utils/db';
import {sendVerificationEmail} from '../utils/email';
import moment from 'moment';

const crypto = require('crypto');

const userListFields = [
  'users.id',
  'users.createdAt',
  'users.lastActive',
  'users.email',
  'users.scope',
  'users.username',
  'users.description',
  'users.avatar',
  'users.compatibility',
  'users.active',
  'users.birthyear',
  'users.status',
  'users.image',
];

const userListFields_2 = [
  'u.id as uid_2',
  'u.createdAt',
  'u.lastActive',
  'u.email',
  'u.scope',
  'u.username',
  'u.description',
  'u.avatar',
  'u.compatibility',
  'u.active',
  'u.birthyear',
  'u.status',
  'u.image',
];

export const dbGetUsers = () =>
  knex('users')
    .leftJoin('banned_users', 'banned_users.user_id', 'users.id')
    .select(userListFields)
    .count('banned_users.id as isbanned')
    .groupBy('users.id')
    .orderBy('users.id', 'asc');

export const dbGetFilteredUsers = filter =>
  knex('users')
    .where('username', 'like', `%${filter.username}%`)
    .orWhere('email', 'like', `%${filter.email}%`)
    .select(userListFields)
    .orderBy('id', 'asc');

export const dbGetUsersBatch = async (pageNumber, userId) => {
  const pageLimit = 10;
  const offset = pageNumber * pageLimit;

  const loveTags = await knex('user_tag')
    .where('userId', userId)
    .andWhere('love', true)
    .select(knex.raw('array_agg(DISTINCT "tagId") as tagsArray'))
    .then(res => {
      return res[0].tagsarray;
    });

  const hateTags = await knex('user_tag')
    .where('userId', userId)
    .andWhere('love', false)
    .select(knex.raw('array_agg(DISTINCT "tagId") as tagsArray'))
    .then(res => {
      return res[0].tagsarray;
    });

  const userLocations = await knex('user_location')
    .leftJoin('locations', 'locations.id', 'user_location.locationId')
    .where('userId', userId)
    .select(knex.raw('array_agg(DISTINCT locations.id) as locationsArray'))
    .then(res => {
      return res[0].locationsarray;
    });

  const usersAlreadyFetched = await knex('users')
    .select(knex.raw('array_agg(DISTINCT users.id) as arr'))
    .leftJoin('user_gender', 'user_gender.userId', 'users.id')
    .leftJoin('genders', 'genders.id', 'user_gender.genderId')
    .leftJoin('user_location', 'user_location.userId', 'users.id')
    .leftJoin('locations', 'locations.id', 'user_location.locationId')
    .leftJoin('user_tag as utlove', 'utlove.userId', 'users.id')
    .leftJoin('user_tag as uthate', 'uthate.userId', 'users.id')
    .whereIn('user_location.locationId', userLocations)
    .andWhereNot('users.id', userId)
    .andWhere('users.scope', 'user')
    .andWhere(knex.raw(`utlove."tagId" IN (${loveTags}) AND utlove."love" = true`))
    .andWhere(knex.raw(`uthate."tagId" IN (${hateTags}) AND uthate."love" = false`))
    .limit(offset)
    .then(res => {
      return res.length > 0 ? res[0].arr : [];
    });

  return knex.from(function () {
    this
      .select([
        ...userListFields,
        knex.raw('array_agg(DISTINCT "gender") AS genders'),
        knex.raw('array_agg(DISTINCT locations.name) AS locations'),
        knex.raw('count(DISTINCT utlove."tagId") AS loveCommon'),
        knex.raw('count(DISTINCT uthate."tagId") AS hateCommon'),
      ])
      .from('users')
      .leftJoin('user_gender', 'user_gender.userId', 'users.id')
      .leftJoin('genders', 'genders.id', 'user_gender.genderId')
      .leftJoin('user_location', 'user_location.userId', 'users.id')
      .leftJoin('locations', 'locations.id', 'user_location.locationId')
      .leftJoin('user_tag as utlove', 'utlove.userId', 'users.id')
      .leftJoin('user_tag as uthate', 'uthate.userId', 'users.id')
      .whereIn('user_location.locationId', userLocations)
      .andWhereNot('users.id', userId)
      .andWhere('users.scope', 'user')
      .andWhere(knex.raw(`utlove."tagId" IN (${loveTags}) AND utlove."love" = true`))
      .andWhere(knex.raw(`uthate."tagId" IN (${hateTags}) AND uthate."love" = false`))
      .as('test')
      .groupBy('users.id');
  }, true)
    .union(function () {
      this
        .select([
          ...userListFields,
          knex.raw('array_agg(DISTINCT "gender") AS genders'),
          knex.raw('array_agg(DISTINCT locations.name) AS locations'),
          knex.raw(`0 AS loveCommon`),
          knex.raw(`0 AS hateCommon `),
        ])
        .from('users')
        .leftJoin('user_gender', 'user_gender.userId', 'users.id')
        .leftJoin('genders', 'genders.id', 'user_gender.genderId')
        .leftJoin('user_location', 'user_location.userId', 'users.id')
        .leftJoin('locations', 'locations.id', 'user_location.locationId')
        .leftJoin('user_tag as utlove', 'utlove.userId', 'users.id')
        .leftJoin('user_tag as uthate', 'uthate.userId', 'users.id')
        .whereIn('user_location.locationId', userLocations)
        .whereNotIn('users.id', usersAlreadyFetched)
        .andWhereNot('users.id', userId)
        .andWhere('users.scope', 'user')
        .groupBy('users.id');
    }, true)
    .as('test_2')
    .limit(pageLimit)
    .offset(offset)
    .orderByRaw('loveCommon DESC, hateCommon DESC');
};

export const dbGetEmailVerification = hash =>
  knex('email_verification')
    .first()
    .where({hash});

export const dbGetUser = async (userId, currentUserId) => {
  // const user = await knex('users')
  //   .leftJoin('banned_users', 'banned_users.user_id', 'users.id')
  //   .select(userListFields)
  //   .count('banned_users.id as isbanned')
  //   .groupBy('users.id')
  //   .first()
  //   .where('users.id', '=', id);

  const user = await knex
    .raw(
      `
    WITH "Users"
    AS (SELECT "users"."id","users"."createdAt","lastActive","image","email","scope",
    "username","description","avatar","active","birthyear","status",
    array_agg(DISTINCT "genders"."gender") AS "genderlist",
    count("banned_users"."id") AS "isbanned"
    FROM "users"
      left join "user_gender"
      ON "user_gender"."userId" = "users"."id"
      left join "genders"
      ON "genders"."id" = "user_gender"."genderId"
          left join "banned_users"
          ON "banned_users"."user_id" = "users"."id"
    WHERE "users"."id" = ${userId}
    GROUP BY "users"."id"),

    "UserLoveCommon"
    AS (SELECT "users"."id" AS "userLoveId",count(DISTINCT "tags"."name") AS "loveCommon"
    FROM "users"
        left join "user_tag"
        ON "user_tag"."userId" = "users"."id"
        left join "tags"
        ON "tags"."id" = "user_tag"."tagId"
    WHERE "user_tag"."love" = ${true}
    AND "users"."id" = ${userId}
    AND "tags"."name" IN (SELECT "tags"."name" FROM "user_tag"
                      left join "tags" ON "tags"."id" = "user_tag"."tagId"
                      WHERE "user_tag"."userId" = ${currentUserId}
                      AND "user_tag"."love" = ${true})
    GROUP BY "users"."id"),

    "UserHateCommon"
    AS (SELECT "users"."id" as "userHateId",
    count(DISTINCT "tags"."name") AS "hateCommon"
    FROM "users"
        left join "user_tag"
        ON "user_tag"."userId" = "users"."id"
        left join "tags"
        ON "tags"."id" = "user_tag"."tagId"
    WHERE "user_tag"."love" = ${false}
    AND "users"."id" = ${userId}
    AND "tags"."name" IN (SELECT "tags"."name" FROM "user_tag"
                      left join "tags" ON "tags"."id" = "user_tag"."tagId"
                      WHERE "user_tag"."userId" = ${currentUserId}
                      AND "user_tag"."love" = ${false})
    GROUP BY "users"."id"),

    "UserLocation"
    AS (SELECT "users"."id" as "userId",
    array_agg(DISTINCT "locations"."name") AS "locations"
    FROM "users"
        left join "user_location"
        ON "user_location"."userId" = "users"."id"
        left join "locations"
        ON "locations"."id" = "user_location"."locationId"
    WHERE "users"."id" = ${userId}
    GROUP BY "users"."id")

    SELECT "id","createdAt","lastActive","image","email","scope","username","description","avatar","active",
    "birthyear","status","genderlist","loveCommon","hateCommon","locations","isbanned"
    FROM "Users"
    left join "UserLoveCommon"
    ON "Users"."id" = "UserLoveCommon"."userLoveId"
    left join "UserHateCommon"
    ON "Users"."id" = "UserHateCommon"."userHateId"
    left join "UserLocation"
    ON "Users"."id" = "UserLocation"."userId"
    `,
    )
    .then(results => results.rows);

  // we convert the image in base 64 so we can display it in our app
  if (user[0].image) {
    user[0].image = user[0].image.toString('base64');
  }

  return user[0];
};

export const dbUpdatePassword = (id, hash) =>
  knex('secrets')
    .update({password: hash})
    .where({ownerId: id});

// export const dbGetUserWithContent = userId =>
//   knex('tags')
//     .leftJoin('user_tag', 'user_tag.tagId', 'tags.id')
//     .where({ 'user_tag.userId': userId });

export const dbGetUserByUsername = (username, userId = -1) =>
  knex('users')
    .where('id', '!=', userId)
    .andWhereRaw('LOWER("username") like ?', `%${username.toLowerCase()}%`);

export const dbGetUserByEmail = (email) =>
  knex('users')
    .whereRaw('LOWER(email) = ?', `${email.toLowerCase()}`);

export const dbUpdateUser = (id, fields) => {
  return knex('users')
    .update(fields)
    .where({id})
    .returning('*');
};

export const dbFetchUserBan = id =>
  knex('banned_users').where('user_id', '=', id);

export const dbBanUser = (id, fields) => {
  fields = {
    ...fields,
    user_id: id,
  };

  return knex('banned_users')
    .returning('*')
    .insert(fields);
};

export const dbUnbanUser = id =>
  knex('banned_users')
    .where('user_id', id)
    .del();


export const dbDelUser = id =>
  knex('users')
    .where({id})
    .del();

export const dbGet30DaysUsers = async () => {
  const users30Days = await knex('users')
    .where('lastActive', '<', moment())
    .andWhere('lastActive', '>', moment().subtract(30, 'days'));
  console.log(users30Days);
  return users30Days;
};
export const dbDelVerificationHash = ownerId =>
  knex('email_verification')
    .where({ownerId})
    .del();

export const dbCreateUser = ({password, genders, ...fields}) =>
  knex.transaction(async trx => {
    console.log(fields.image);
    const user = await trx('users')
      .insert(fields)
      .returning('*')
      .then(results => results[0]); // return only first result

    await trx('secrets')
      .insert({
        ownerId: user.id,
        password,
      })
      .then();

    const genderArray = [];
    if (genders) {
      genders.forEach(gender => {
        genderArray.push({userId: user.id, genderId: gender});
      });
    }

    await trx('user_gender')
      .insert(genderArray)
      .then();

    // console.log('Creating Hash');
    const hash = crypto.randomBytes(48).toString('hex');

    await trx('email_verification')
      .insert({
        ownerId: user.id,
        hash,
      })
      .then();

    // console.log('Sending Hash Email now to', user.email);
    // activate this here later
    // sendVerificationEmail(hash, user.email);

    return user;
  });

export const dbRegisterNotificationToken = (userId, token) => {
  return knex('users')
    .update({notificationToken: token})
    .where({id: userId})
    .then();
};

export const dbUserIsBanned = (user) => {
  return knex('banned_users').where({'user_id': user.id}).countDistinct('user_id').then(res => res[0].count > 0);
};
