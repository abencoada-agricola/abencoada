import assert from 'node:assert/strict';
import {installUppercaseInputs} from '../web/text-case.js';
class Input{constructor(type,value,attributes=[]){this.type=type;this.value=value;this.attributes=new Set(attributes);this.selectionStart=this.selectionEnd=value.length}hasAttribute(name){return this.attributes.has(name)}setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end}}
class Textarea extends Input{}
class Form{constructor(elements){this.elements=elements}}
globalThis.HTMLInputElement=Input;globalThis.HTMLTextAreaElement=Textarea;globalThis.HTMLFormElement=Form;
const handlers=new Map();globalThis.document={addEventListener(name,fn){handlers.set(name,fn)}};installUppercaseInputs();
const username=new Input('text','admin');const password=new Input('password','aBc123',['data-password']);
handlers.get('input')({target:username});assert.equal(username.value,'ADMIN');
handlers.get('input')({target:password});assert.equal(password.value,'aBc123');
password.type='text';handlers.get('focusin')({target:password});handlers.get('input')({target:password});handlers.get('change')({target:password});assert.equal(password.value,'aBc123');
username.value='operador';handlers.get('submit')({target:new Form([username,password])});assert.equal(username.value,'OPERADOR');assert.equal(password.value,'aBc123');
console.log('Uppercase usernames and unchanged masked/visible passwords passed.');
