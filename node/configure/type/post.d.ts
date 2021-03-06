/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type NoName1 = string;
export type NoName6 = string;
export type NoName8 = string;
export type NoName11 = string;
export type NoName12 = string;
export type NoName13 = string;
export type View1 = string;
export type NoName14 = number;
export type NoName16 = string;
export type NoName17 = string;
export type NoName18 = string;
export type NoName20 = string;
export type View2 = string;
/**
 * https://www.sitemaps.org/protocol.html
 */
export type URL = number;
export type NoName22 = string;
export type NoName23 = string;
export type NoName24 = string;
export type NoName25 = string;
export type NoName26 = string;
export type NoName27 = string;
export type NoName28 = number;
export type NoName29 = string;
export type NoName30 = string;
export type NoName31 = string;
export type URL1 = string;
export type URL2 = string;
export type NoName32 = string;
export type NoName33 = string;
export type URL3 = string;
export type URLLocal = string;
export type NoName36 = number;
export type NoName37 = string;
export type NoName38 = number;
export type NoName39 = string;
export type NoName41 = number;
export type NoName42 = string;
export type NoName44 = number;
export type NoName45 = string;
export type NoName46 = string;

export interface NoName {
  view: View;
  validator: NoName2;
  insert: NoName5;
  update: NoName7;
  update_modified: NoName9;
  feed_create: Feed;
  sitemap_create: NoName19;
  newly_json_create: JSON;
  twitter: TwitterAPI;
  media_upload: NoName34;
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
  response: NoName10;
}
export interface NoName10 {
  message_success: NoName11;
  message_failure: NoName12;
}
export interface Feed {
  path: NoName13;
  view_path: View1;
  maximum_number: NoName14;
  response: NoName15;
}
export interface NoName15 {
  message_none: NoName16;
  message_success: NoName17;
  message_failure: NoName18;
}
export interface NoName19 {
  path: NoName20;
  view_path: View2;
  url_limit: URL;
  response: NoName21;
}
export interface NoName21 {
  message_success: NoName22;
  message_failure: NoName23;
}
export interface JSON {
  directory: NoName24;
  filename_prefix: NoName25;
  filename_separator: NoName26;
  extension: NoName27;
  maximum_number: NoName28;
  response: API;
}
export interface API {
  message_success: NoName29;
  message_failure: NoName30;
}
export interface TwitterAPI {
  message_prefix: NoName31;
  url_prefix: URL1;
  media_url_prefix: URL2;
  api_response: API1;
}
export interface API1 {
  message_success: NoName32;
  message_failure: NoName33;
}
export interface NoName34 {
  url: URL3;
  url_dev: URLLocal;
  api_response: API2;
}
export interface API2 {
  success: NoName35;
  type: MIME;
  overwrite: NoName40;
  size: NoName43;
  other_message_failure: NoName46;
}
export interface NoName35 {
  code: NoName36;
  message: NoName37;
}
export interface MIME {
  code: NoName38;
  message: NoName39;
}
export interface NoName40 {
  code: NoName41;
  message: NoName42;
}
export interface NoName43 {
  code: NoName44;
  message: NoName45;
}
