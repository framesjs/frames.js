import * as protobufs from "./generated/message";
import { UserNameProof } from "./generated/username_proof";

/** Message types */

export type CastAddData = protobufs.MessageData & {
  type: protobufs.MessageType.CAST_ADD;
  castAddBody: protobufs.CastAddBody;
};

export type CastAddMessage = protobufs.Message & {
  data: CastAddData;
  signatureScheme: protobufs.SignatureScheme.ED25519;
};

export type CastRemoveData = protobufs.MessageData & {
  type: protobufs.MessageType.CAST_REMOVE;
  castRemoveBody: protobufs.CastRemoveBody;
};

export type CastRemoveMessage = protobufs.Message & {
  data: CastRemoveData;
  signatureScheme: protobufs.SignatureScheme.ED25519;
};

export type LinkAddData = protobufs.MessageData & {
  type: protobufs.MessageType.LINK_ADD;
  linkBody: protobufs.LinkBody;
};

export type LinkAddMessage = protobufs.Message & {
  data: LinkAddData;
  signatureScheme: protobufs.SignatureScheme.ED25519;
};

export type LinkRemoveData = protobufs.MessageData & {
  type: protobufs.MessageType.LINK_REMOVE;
  linkBody: protobufs.LinkBody;
};

export type LinkRemoveMessage = protobufs.Message & {
  data: LinkRemoveData;
  signatureScheme: protobufs.SignatureScheme.ED25519;
};

export type ReactionAddData = protobufs.MessageData & {
  type: protobufs.MessageType.REACTION_ADD;
  reactionBody: protobufs.ReactionBody;
};

export type ReactionAddMessage = protobufs.Message & {
  data: ReactionAddData;
  signatureScheme: protobufs.SignatureScheme.ED25519;
};

export type ReactionRemoveData = protobufs.MessageData & {
  type: protobufs.MessageType.REACTION_REMOVE;
  reactionBody: protobufs.ReactionBody;
};

export type ReactionRemoveMessage = protobufs.Message & {
  data: ReactionRemoveData;
  signatureScheme: protobufs.SignatureScheme.ED25519;
};

export type VerificationAddAddressData = protobufs.MessageData & {
  type: protobufs.MessageType.VERIFICATION_ADD_ETH_ADDRESS;
  verificationAddAddressBody: protobufs.VerificationAddAddressBody;
};

export type VerificationAddAddressMessage = protobufs.Message & {
  data: VerificationAddAddressData;
  signatureScheme: protobufs.SignatureScheme.ED25519;
};

export type VerificationRemoveData = protobufs.MessageData & {
  type: protobufs.MessageType.VERIFICATION_REMOVE;
  verificationRemoveBody: protobufs.VerificationRemoveBody;
};

export type VerificationRemoveMessage = protobufs.Message & {
  data: VerificationRemoveData;
  signatureScheme: protobufs.SignatureScheme.ED25519;
};

export type UserDataAddData = protobufs.MessageData & {
  type: protobufs.MessageType.USER_DATA_ADD;
  userDataBody: protobufs.UserDataBody;
};

export type UserDataAddMessage = protobufs.Message & {
  data: UserDataAddData;
  signatureScheme: protobufs.SignatureScheme.ED25519;
};

export type UsernameProofData = protobufs.MessageData & {
  type: protobufs.MessageType.USERNAME_PROOF;
  usernameProofBody: UserNameProof;
};

export type UsernameProofMessage = protobufs.Message & {
  data: UsernameProofData;
  signatureScheme: protobufs.SignatureScheme.ED25519;
};

export type FrameActionData = protobufs.MessageData & {
  type: protobufs.MessageType.FRAME_ACTION;
  frameActionBody: protobufs.FrameActionBody;
};

export type FrameActionMessage = protobufs.Message & {
  data: FrameActionData;
  signatureScheme: protobufs.SignatureScheme.ED25519;
};
