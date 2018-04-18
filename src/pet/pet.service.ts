"use strict";

import { NextFunction } from "express-serve-static-core";
import { Pet, IPet } from "./pet.schema";
import { IUserSession, IUserSessionRequest } from "../security/security.service";

import * as mongoose from "mongoose";
import * as errorHandler from "../utils/error.handler";
import * as express from "express";
import * as escape from "escape-html";

/**
 * Retorna los datos de la mascota
 */
export interface IReadRequest extends IUserSessionRequest {
  pet: IPet;
}
export function read(req: IReadRequest, res: express.Response) {
  res.json(req.pet);
}



/**
 * Actualiza los datos de la mascota
 */
export interface IUpdateRequest extends IUserSessionRequest {
  pet: IPet;
}
export function validateUpdate(req: IUpdateRequest, res: express.Response, next: NextFunction) {
  if (req.body.name) {
    req.check("name", "Hasta 256 caracteres solamente.").isLength({ max: 256 });
    req.sanitize("name").escape();
  }
  if (req.body.description) {
    req.check("description", "Hasta 1024 caracteres solamente.").isLength({ max: 1024 });
    req.sanitize("description").escape();
  }
  if (req.body.birthDate) {
    req.check("birthDate", "No es v&aacute;lido").isLength({ min: 1 });
    req.sanitize("birthDate").escape();
  }

  req.getValidationResult().then(function (result) {
    if (!result.isEmpty()) {
      return errorHandler.handleExpressValidationError(res, result);
    }
    next();
  });
}
export function update(req: IUpdateRequest, res: express.Response) {
  let pet = req.pet;
  if (!pet) {
    pet = new Pet();
    pet.user = req.user._id;
  }

  if (req.body.name) {
    pet.name = req.body.name;
  }
  if (req.body.description) {
    pet.description = req.body.description;
  }
  if (req.body.birthDate) {
    pet.birthDate = req.body.birthDate;
  }

  pet.save(function (err: any) {
    if (err) return errorHandler.handleError(res, err);

    res.json(pet);
  });
}


/**
 * Elimina una mascota
 */
export interface IRemoveRequest extends IUserSessionRequest {
  pet: IPet;
}
export function remove(req: IRemoveRequest, res: express.Response) {
  const pet = <IPet>req.pet;

  pet.enabled = false;
  pet.save(function (err: any) {
    if (err) return errorHandler.handleError(res, err);

    res.json(pet);
  });
}

export function findByCurrentUser(req: IUserSessionRequest, res: express.Response, next: NextFunction) {
  Pet.find({
    user: req.user._id,
    enabled: true
  }).exec(function (err, pets) {
    if (err) return next();
    res.json(pets);
  });
}

/**
 * Filtro para buscar y popular una mascota por id.
 * El resultado de la busqueda se popula en req.
 */
export interface IFindByIdRequest extends express.Request {
  pet: IPet;
}
export function findByID(req: IFindByIdRequest, res: express.Response, next: NextFunction, id: string) {
  Pet.findOne({
    _id: escape(id),
    enabled: true
  },
    function (err, pet) {
      if (err) return errorHandler.handleError(res, err);

      if (!pet) {
        return errorHandler.sendError(res, errorHandler.ERROR_NOT_FOUND, "No se pudo cargar la mascota " + id);
      }

      req.pet = pet;
      next();
    });
}

/**
 * Autorizacion, el unico que puede modificar el mascota es el dueño
 */
export interface IValidateOwnerRequest extends IUserSessionRequest {
  pet: IPet;
}
export function validateOwner(req: IValidateOwnerRequest, res: express.Response, next: NextFunction) {
  if (!((req.pet.user as any).equals(req.user._id))) {
    return errorHandler.sendError(res, errorHandler.ERROR_UNAUTORIZED_METHOD, "User is not authorized");
  }
  next();
}
