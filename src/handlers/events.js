import Boom from 'boom';
import moment from 'moment';
import { resizeImage } from '../utils/image';

import {
  dbGetEvents,
  dbGetEvent,
  dbCreateEvent,
  dbDelEvent,
  dbUpdateEvent,
  dbGetEventParticipantsNum,
} from '../models/events';

export const getEvents = (request, reply) =>
  dbGetEvents(request.params.userId).then(reply);

export const getEventParticipantsNum = (request, reply) =>
  dbGetEventParticipantsNum().then(reply);

export const getEvent = (request, reply) =>
  dbGetEvent(request.params.eventId).then(reply);

export const CreateEvent = async (request, reply) => {
  const fields = {};

  for (const field in request.payload) {
    fields[field] = request.payload[field];
  }

  dbCreateEvent({
    createdAt: moment(),
    title: request.payload.title,
    description: request.payload.description,
    address: request.payload.address,
    city: request.payload.city,
    eventDate: request.payload.eventDate,
    minParticipants: request.payload.minParticipants,
    maxParticipants: request.payload.maxParticipants,
    participantsMix: request.payload.participantsMix,
    eventImage: request.payload.eventImage,
    hostId: request.payload.hostId
  }).then(reply);
};

export const UpdateEvent = async (request, reply) => {
  const fields = {
    createdAt: moment(),
    title: request.payload.title,
    eventImage: request.payload.eventImage,
    description: request.payload.description,
    address: request.payload.address,
    city: request.payload.city,
    eventDate: request.payload.eventDate,
    minParticipants: request.payload.minParticipants,
    maxParticipants: request.payload.maxParticipants,
    participantsMix: request.payload.participantsMix,
  };

  return dbUpdateEvent(request.params.eventId, fields).then(reply);
};

// TODO: only the creator of the event can delete it
// Delete a Event that is connected to a user
export const delEvent = (request, reply) => {
  return dbDelEvent(request.params.id).then(reply);
};
