"use strict";

import { NextFunction } from "express-serve-static-core";
import { IImage } from "./image.schema";
import { IUserSession, IUserSessionRequest } from "../security/security.service";

import * as errorHandler from "../utils/error.handler";
import * as express from "express";
import * as escape from "escape-html";
import * as uuid from "uuid/v1";
import * as redis from "ioredis";
import * as appConfig from "../utils/environment";

const conf = appConfig.getConfig(process.env);
const redisClient = new redis(conf.redisPort, conf.redisHost);
redisClient.on("connect", function () {
  console.log("connected");
});


/**
 * Busca una imagen
 */
export interface IReadRequest extends express.Request {
  image: IImage;
}
export function read(req: IReadRequest, res: express.Response) {
  res.json(req.image);
}

/**
 * Crea una imagen
 */
export function validateCreate(req: express.Request, res: express.Response, next: NextFunction) {
  if (req.body.image) {
    req.check("image", "Debe especificar la imagen.").isLength({ min: 1 });
    req.check("image", "Imagen invalida").contains("data:image/");
  }

  req.getValidationResult().then(function (result) {
    if (!result.isEmpty()) {
      return errorHandler.handleExpressValidationError(res, result);
    }
    next();
  });
}
export function create(req: express.Request, res: express.Response) {
  const image: IImage = {
    id: uuid(),
    image: req.body.image
  };

  redisClient.set(image.id, image.image, function (err: any, reply: any) {
    if (err) {
      return errorHandler.handleError(res, err);
    }

    res.json({ id: image.id });
  });
}

export interface IFindByIdRequest extends express.Request {
  image: IImage;
}
export function findByID(req: IFindByIdRequest, res: express.Response, next: NextFunction, id: string) {
  redisClient.get(escape(id), function (err, reply) {
    if (err) return errorHandler.handleError(res, err);

    if (!reply) {
      return errorHandler.sendError(res, errorHandler.ERROR_NOT_FOUND, "No se pudo cargar la imagen " + id);
    }

    req.image = {
      id: escape(id),
      image: reply
    };
    next();
  });
}
