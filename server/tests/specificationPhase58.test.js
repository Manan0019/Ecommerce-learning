import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSpecificationType,getSpecificationDefinition} from '../config/productSpecifications.js';
import {validateSpecifications} from '../services/productSpecificationService.js';
test('category-specific definitions for non-electronics products',()=>{
 for(const [name,expected] of [['Shirt','clothing'],['Jeans','clothing'],['Sneakers','footwear'],['Skincare','skincare'],['Sunscreens','skincare'],['Fragrance','fragrance'],['Hair Oil','personalCare'],['Kitchen Appliances','home'],['Other','general'],['Smartphones & Mobiles','smartphone'],['Televisions & Displays','display'],['Cameras & Photography','camera'],['Computer Accessories & Peripherals','computerAccessory'],['Chargers & Power Banks','charger'],['Network & Wi-Fi','networking'],['Storage Devices','storage']]){
  assert.equal(resolveSpecificationType({name}),expected,name);
 }
 assert.equal(resolveSpecificationType({name:'Toners',path:'Beauty & Personal Care / Skincare'}),'skincare');
});
test('fields are server validated and reject inappropriate category fields',()=>{
 const shirt={name:'Shirt',path:'Fashion'};
 assert.deepEqual(validateSpecifications(shirt,{fabric:'Cotton',fit:'Regular'}).specifications,{fabric:'Cotton',fit:'Regular'});
 assert.throws(()=>validateSpecifications(shirt,{processorFamily:'Apple A-Series'}),/INVALID_SPECIFICATIONS/);
 assert.equal(getSpecificationDefinition({name:'Shirt'}).label,'Clothing & apparel');
});
test('existing legacy fields survive editing but cannot be forged',()=>{
 const legacy={connectivity:'Bluetooth',productType:'Shirt'};
 assert.deepEqual(validateSpecifications({name:'Shirt'},{...legacy,fabric:'Cotton'},legacy).specifications,{...legacy,fabric:'Cotton'});
 assert.throws(()=>validateSpecifications({name:'Shirt'},{connectivity:'Hacked'},legacy),/INVALID_SPECIFICATIONS/);
});
