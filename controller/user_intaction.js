const resp = require("../helper/response");
const CONSTANT = require("../constants/constants");
const MSG = require("../messages/messages");
const db = require("../models/index");
const USERS = db.users;
const USER_PREFERENCES = db.users_preferences;
const USER_INTERACTIONS = db.user_interactions;

// const { body, validationResult } = require('express-validator');
// const { Op, where } = require("sequelize");


//////////////////////////////////////// ELO ALGO AS A FUNCTION //////////////////////////////////////////
function calculateNewRatings(target_profile_score, user_profile_score, user_action, traget_user_action, k) {

    const expectedOutcomeA = 1 / (1 + Math.pow(10, target_profile_score - user_profile_score) / 400);
    const expectedOutcomeB = 1 / (1 + Math.pow(10, user_profile_score - target_profile_score) / 400);

    const outComeA = user_action;
    const outComeB = traget_user_action;

    const newRating_user = user_profile_score + k * (parseInt(outComeA) - expectedOutcomeA);
    const newRating_target_user = target_profile_score + k * (parseInt(outComeB) - expectedOutcomeB);

    console.log("New Rating for Target User:", parseFloat(newRating_target_user));

    return {
        newRating_user,
        newRating_target_user,
    };
};

// //////////////////////////////////////// USER INTRACTON ///////////////////////////////////////////// 
exports.intraction = async function (req, res) {
    try {
        const findUser = await USERS.findOne({
            where: {
                id: req.currentUser.id
            },
            include: {
                model: USER_PREFERENCES,
            }
        });
        console.log(req.currentUser.id);
        const latitude = findUser.latitude;
        const longitude = findUser.longitude;
        const radius = findUser.users_preference.distance_preference

        if (findUser == null) { return resp.failedResponse(res, "User not found"); }
        
        ////////////////////////////////////// USERS PREFERENCES MATCHING ///////////////////////////////////////////////////////////
        if(req.query.stage == '1'){
        const findMacthes = await USER_PREFERENCES.findAll({
            where: {
                preferred_gender: findUser.users_preference.preferred_gender,
                interests: findUser.users_preference.interests,
                age_preference: findUser.users_preference.age_preference,
                // income_preference: findUser.users_preference.income_preference,
                education_preference: findUser.users_preference.education_preference,
                preferred_gender: findUser.users_preference.preferred_gender,
                distance_preference: findUser.users_preference.distance_preference,
            },
            // include: { model: USERS, attributes: ['id', 'gender', 'username'] },
            

        // ////////////////////////////////////// GEO AREA RADIUS MATCHING ///////////////////////////////////////////////////////////
            include: { model: USERS,
                attributes: [
                    'id',
                    'username',
                    'gender',
                    'latitude',
                    'longitude',
                    [
                        db.sequelize.literal(
                            "6371 * acos(cos(radians(" +
                            latitude +
                            ")) * cos(radians(latitude)) * cos(radians(" +
                            longitude +
                            ") - radians(longitude)) + sin(radians(" +
                            latitude +
                            ")) * sin(radians(latitude)))"
                        ),
                        "distance",
                    ]
                ],
                where:
                    db.sequelize.where(
                        db.sequelize.literal(
                            "6371 * acos(cos(radians(" +
                            latitude +
                            ")) * cos(radians(latitude)) * cos(radians(" +
                            longitude +
                            ") - radians(longitude)) + sin(radians(" +
                            latitude +
                            ")) * sin(radians(latitude)))"
                        ),
                        "<=",
                        `${radius}`
                    ),
    
                group: ["USERS.id"],
                having: db.sequelize.literal(),
            },
            attributes: []
            // raw: true
            
        });
        return resp.successResponse(res, "USERS_FOUND", { findMacthes });
    }
        ///////////////////////////////////////// UPDATING INTRACTION AFTER MATCH //////////////////////////////////////////////

        const { user_id, target_user_id, user_action, traget_user_action } = req.query
        const payload = {
            user_id,
            target_user_id,
            user_action,
            traget_user_action
        }
        // return resp.json(payload)
        const findUser_rating = await USERS.findOne({ where: { id: req.query.user_id } });
        const findTargetUser_rating = await USERS.findOne({ where: { id: req.query.target_user_id } });


        const target_profile_socre = findTargetUser_rating.profile_rating
        const user_profile_score = findUser_rating.profile_rating
        const k = 32;

        if (req.query.user_action == '1' && req.query.traget_user_action == '1') {

            const target_profile_socre = findTargetUser_rating.profile_rating
            const user_profile_score = findUser_rating.profile_rating
            const user_action = req.query.user_action;
            const traget_user_action = req.query.traget_user_action;
            const k = 32;

            const { newRating_user, newRating_target_user } = calculateNewRatings(
                target_profile_socre,
                user_profile_score,
                user_action,
                traget_user_action,
                k
            );
            await USERS.update({ profile_rating: newRating_user }, { where: { id: req.query.user_id } })
            await USERS.update({ profile_rating: newRating_target_user }, { where: { id: req.query.target_user_id } })
        }
        if (req.query.user_action == '0' && req.query.traget_user_action == '1') {
            const { newRating_user, newRating_target_user } = calculateNewRatings(
                target_profile_socre,
                user_profile_score,
                user_action,
                traget_user_action,
                k
            );
            await USERS.update({ profile_rating: newRating_user }, { where: { id: req.query.user_id } })
            await USERS.update({ profile_rating: newRating_target_user }, { where: { id: req.query.target_user_id } })
        }
        if (req.query.user_action == '1' && req.query.traget_user_action == '0') {

            const { newRating_user, newRating_target_user } = calculateNewRatings(
                target_profile_socre,
                user_profile_score,
                user_action,
                traget_user_action,
                k
            );
            await USERS.update({ profile_rating: newRating_user }, { where: { id: req.query.user_id } })
            await USERS.update({ profile_rating: newRating_target_user }, { where: { id: req.query.target_user_id } })
        }
        if (req.query.user_action == '0' && req.query.traget_user_action == '0') {

            const { newRating_user, newRating_target_user } = calculateNewRatings(
                target_profile_socre,
                user_profile_score,
                user_action,
                traget_user_action,
                k
            );
            await USERS.update({ profile_rating: newRating_user }, { where: { id: req.query.user_id } })
            await USERS.update({ profile_rating: newRating_target_user }, { where: { id: req.query.target_user_id } })
        }

        const data = await USER_INTERACTIONS.create(payload)
        return resp.successResponse(res, "USERS_FOUND", { data });

    } catch (error) {
        return resp.failedResponse(res, error.message);
    }
}

// exports.inYourArea = async (req, res) => {
//     try {
//         const findUser1 = await USERS.findOne({ where: { id: req.currentUser.id },
//             include: {
//                 model: USER_PREFERENCES,
//             }
//         });
//         const latitude = findUser1.latitude;
//         const longitude = findUser1.longitude;
//         const radius = findUser1.users_preference.distance_preference

//         const users = await USERS.findAll({
//             attributes: [
//                 'id',
//                 'latitude',
//                 'longitude',
//                 [
//                     db.sequelize.literal(
//                         "6371 * acos(cos(radians(" +
//                         latitude +
//                         ")) * cos(radians(latitude)) * cos(radians(" +
//                         longitude +
//                         ") - radians(longitude)) + sin(radians(" +
//                         latitude +
//                         ")) * sin(radians(latitude)))"
//                     ),
//                     "distance",
//                 ]
//             ],
//             where:
//                 db.sequelize.where(
//                     db.sequelize.literal(
//                         "6371 * acos(cos(radians(" +
//                         latitude +
//                         ")) * cos(radians(latitude)) * cos(radians(" +
//                         longitude +
//                         ") - radians(longitude)) + sin(radians(" +
//                         latitude +
//                         ")) * sin(radians(latitude)))"
//                     ),
//                     "<=",
//                     `${radius}`
//                 ),

//             group: ["USERS.id"],
//             having: db.sequelize.literal(),
//         });
//         return resp.successResponse(res, "SUCCESS", users);
//     } catch (error) {
//         return resp.failedResponse(res, error.message);
//     }
// };
