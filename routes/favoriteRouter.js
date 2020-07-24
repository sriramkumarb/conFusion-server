const express = require("express");
const bodyParser = require("body-parser");
const Favorites = require("../models/favorites");
const favoriteRouter = express.Router();
const verifyUser = require("../authenticate").verifyUser;
const cors = require("./cors");

favoriteRouter.use(bodyParser.json());

favoriteRouter
    .route("/")

    .get(cors.cors, verifyUser, (req, res, next) => {
        Favorites.find({ user: req.user._id })
            .populate("dishes")
            .populate("user")
            .then(favorites => {
                res.json(favorites);
            })
            .catch(err => next(err));
    })
    .post(cors.corsWithOptions, verifyUser, (req, res, next) => {
        /*
          req is an array like this:
          [
            {"_id": "5bb952eeef1bb1785facd3ac"},
            {"_id":  "5bb95873a2c0d37e3662a2a3"}
          ]
          */
        const newDishes = req.body.map(elem => elem._id); // convert array of objs to array of values ["5bb952", "5bb95"]

        Favorites.findOne({ user: req.user._id })
            .then(
                favorite => {
                    if (!favorite) {
                        Favorites.create({ user: req.user._id })
                            .then(favorite => {
                                console.log("New Favorite created ");
                                const oldDishes = [];
                                let dishes = concatDishes(newDishes, oldDishes);
                                favorite.dishes = dishes;
                                favorite
                                    .save()
                                    .then(favorite => {
                                        Favorites.findById(favorite._id)
                                            .populate("user")
                                            .populate("dishes")
                                            .then(favorite => {
                                                res.json(favorite);
                                            });
                                    })
                                    .catch(err => {
                                        return next(err);
                                    });
                            })
                            .catch(err => next(err));
                    } else {
                        let oldDishes = favorite.dishes.map(elem => elem.toString());
                        let dishes = concatDishes(newDishes, oldDishes);
                        favorite.dishes = dishes;
                        favorite
                            .save()
                            .then(favorite => {
                                Favorites.findById(favorite._id)
                                    .populate("user")
                                    .populate("dishes")
                                    .then(favorite => {
                                        res.json(favorite);
                                    });
                            })
                            .catch(err => {
                                return next(err);
                            });
                    }
                },
                err => next(err)
            )
            .catch(err => next(err));
    })
    .put(cors.corsWithOptions, verifyUser, (req, res, next) => {
        res.status(403).end("PUT operation not supported on /favorites");
    })
    .delete(cors.corsWithOptions, verifyUser, (req, res, next) => {
        Favorites.deleteOne({ user: req.user._id })
            .then(
                resp => {
                    res.json(resp);
                },
                err => next(err)
            )
            .catch(err => next(err));
    });

favoriteRouter
    .route("/:dishId")
    .get(cors.cors, verifyUser, (req, res, next) => {
        Favorites.findOne({ user: req.user._id })
            .then(
                favorites => {
                    if (!favorites) {
                        return res.json({ exists: false, favorites: favorites });
                    } else {
                        if (favorites.dishes.indexOf(req.params.dishId) < 0) {
                            return res.json({ exists: false, favorites: favorites });
                        } else {
                            return res.json({ exists: true, favorites: favorites });
                        }
                    }
                },
                err => next(err)
            )
            .catch(err => next(err));
    })
    .post(cors.corsWithOptions, verifyUser, (req, res, next) => {
        // we well apply logic from route "/", insted of req.body we will use req.params.dishId
        // we converted single dish to array for implement logic from route post to "/favorites"
        Favorites.findOne({ user: req.user._id })
            .then(
                favorite => {
                    if (!favorite) {
                        Favorites.create({ user: req.user._id })
                            .then(favorite => {
                                console.log("New Favorite created ");
                                favorite.dishes.push(req.params.dishId);
                                favorite
                                    .save()
                                    .then(favorite => {
                                        Favorites.findById(favorite._id)
                                            .populate("user")
                                            .populate("dishes")
                                            .then(favorite => {
                                                res.json(favorite);
                                            });
                                    })
                                    .catch(err => {
                                        return next(err);
                                    });
                            })
                            .catch(err => next(err));
                    } else {
                        let oldDishes = favorite.dishes.map(elem => elem.toString());
                        let dishes = concatDishes(newDishes, oldDishes);
                        favorite.dishes = dishes;
                        favorite
                            .save()
                            .then(favorite => {
                                Favorites.findById(favorite._id)
                                    .populate("user")
                                    .populate("dishes")
                                    .then(favorite => {
                                        res.json(favorite);
                                    });
                            })
                            .catch(err => {
                                return next(err);
                            });
                    }
                },
                err => next(err)
            )
            .catch(err => next(err));
    })
    .put(cors.corsWithOptions, verifyUser, (req, res, next) => {
        res.status(403).end("PUT operation not supported on /favorites/:dishId");
    })
    .delete(cors.corsWithOptions, verifyUser, (req, res, next) => {
        Favorites.findOne({ user: req.user._id })
            .then(
                favorite => {
                    if (favorite) {
                        let oldDishes = favorite.dishes.map(elem => elem.toString()); //ObjectId to String
                        let dishes = new Set(oldDishes); // array to set
                        let dishId = req.params.dishId;
                        if (!dishes.has(dishId)) {
                            err = new Error(`Dish  ${dishId}  not found in favorites`);
                            err.status = 404;
                            return next(err);
                        } else {
                            dishes.delete(dishId);
                            dishes = [...dishes]; // convert set to array
                            favorite.dishes = dishes;
                            favorite.save().then(favorite => {
                                Favorites.findById(favorite._id)
                                    .populate("user")
                                    .populate("dishes")
                                    .then(favorite => {
                                        res.json(favorite);
                                    });
                            });
                        }
                    } else {
                        err = new Error(`Favorites for user  ${req.user._id}  doesn't exist`);
                        err.status = 404;
                        return next(err);
                    }
                },
                err => next(err)
            )
            .catch(err => next(err));
    });

//this function concatenates two arrays into one with unique values

function concatDishes(newDishes, oldDishes) {
    let dishes = newDishes.concat(oldDishes);
    dishes = new Set(dishes);
    console.log("Set(dishes)", dishes);
    dishes = [...dishes];
    return dishes;
}

module.exports = favoriteRouter;