/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type NoName1 = string;
export type NoName6 = string;
export type NoName8 = string;
export type NoName10 = string;
export type NoName11 = string;
export type View1 = string;
export type NoName12 = number;
export type NoName14 = string;
export type NoName15 = string;
export type NoName16 = string;
export type NoName18 = string;
export type View2 = string;
/**
 * https://www.sitemaps.org/protocol.html
 */
export type URL = number;
export type NoName20 = string;
export type NoName21 = string;
export type NoName22 = string;
export type NoName23 = number;
export type NoName24 = string;
export type NoName25 = string;
export type NoName26 = string;
export type URL1 = string;
export type URL2 = string;
export type APIKey = string;
export type APIKeySecret = string;
export type AccessToken = string;
export type AccessTokenSecret = string;
export type NoName28 = string;
export type NoName29 = string;
export type URL3 = string;
export type URLLocal = string;
export type NoName32 = number;
export type NoName33 = string;
export type NoName34 = number;
export type NoName35 = string;
export type NoName37 = number;
export type NoName38 = string;
export type NoName40 = number;
export type NoName41 = string;
export type NoName42 = string;

export interface NoName {
  view: View;
  validator: NoName2;
  insert: NoName5;
  update: NoName7;
  update_modified: NoName9;
  feed_create: Feed;
  sitemap_create: NoName17;
  newly_json_create: JSON;
  twitter: TwitterAPI;
  media_upload: NoName30;
}
export interface View {
  init: NoName1;
}
export interface NoName2 {
  title: NoName3;
}
export interface NoName3 {
  message: NoName4;
}
export interface NoName4 {
  [k: string]: unknown;
}
export interface NoName5 {
  message_success: NoName6;
}
export interface NoName7 {
  message_success: NoName8;
}
export interface NoName9 {
  message_success: NoName10;
}
export interface Feed {
  path: NoName11;
  view_path: View1;
  maximum_number: NoName12;
  response: NoName13;
}
export interface NoName13 {
  message_none: NoName14;
  message_success: NoName15;
  message_failure: NoName16;
}
export interface NoName17 {
  path: NoName18;
  view_path: View2;
  url_limit: URL;
  response: NoName19;
}
export interface NoName19 {
  message_success: NoName20;
  message_failure: NoName21;
}
export interface JSON {
  path: NoName22;
  maximum_number: NoName23;
  response: API;
}
export interface API {
  message_success: NoName24;
  message_failure: NoName25;
}
export interface TwitterAPI {
  message_prefix: NoName26;
  url_prefix: URL1;
  media_url_prefix: URL2;
  production: NoName27;
  api_response: API1;
}
export interface NoName27 {
  consumer_key: APIKey;
  consumer_secret: APIKeySecret;
  access_token: AccessToken;
  access_token_secret: AccessTokenSecret;
}
export interface API1 {
  message_success: NoName28;
  message_failure: NoName29;
}
export interface NoName30 {
  url: URL3;
  url_dev: URLLocal;
  api_response: API2;
}
export interface API2 {
  success: NoName31;
  type: MIME;
  overwrite: NoName36;
  size: NoName39;
  other_message_failure: NoName42;
}
export interface NoName31 {
  code: NoName32;
  message: NoName33;
}
export interface MIME {
  code: NoName34;
  message: NoName35;
}
export interface NoName36 {
  code: NoName37;
  message: NoName38;
}
export interface NoName39 {
  code: NoName40;
  message: NoName41;
}
