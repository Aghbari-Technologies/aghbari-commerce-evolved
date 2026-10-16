import { describe, expect, it } from "vitest";
import { validateCustomerReorderTemplateInput } from "@/lib/customer-reorder-templates";
const productId="a1000000-0000-4000-8000-000000000001";
describe("customer reorder-template input validation",()=>{
 it("normalizes names and accepts positive integer quantities",()=>{
  expect(validateCustomerReorderTemplateInput("  قالب دوري  ",[{product_id:productId,quantity:3}])).toEqual({name:"قالب دوري",lines:[{product_id:productId,quantity:3}]});
 });
 it("rejects invalid names, empty sets and fractional quantities",()=>{
  expect(()=>validateCustomerReorderTemplateInput("x",[{product_id:productId,quantity:1}])).toThrow("حرفين");
  expect(()=>validateCustomerReorderTemplateInput("قالب صحيح",[])).toThrow("صنفًا واحدًا");
  expect(()=>validateCustomerReorderTemplateInput("قالب صحيح",[{product_id:productId,quantity:1.5}])).toThrow("عددًا صحيحًا");
 });
 it("rejects duplicate or malformed product IDs",()=>{
  expect(()=>validateCustomerReorderTemplateInput("قالب صحيح",[{product_id:productId,quantity:1},{product_id:productId,quantity:2}])).toThrow("لا تكرر");
  expect(()=>validateCustomerReorderTemplateInput("قالب صحيح",[{product_id:"bad",quantity:1}])).toThrow("معرّف غير صالح");
 });
});
