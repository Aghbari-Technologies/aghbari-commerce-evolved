import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), args: [] as Array<{name:string;params:Record<string,unknown>}> }));
vi.mock("@/lib/supabase",()=>({supabase:{rpc:(name:string,params:Record<string,unknown>)=>{mocks.args.push({name,params});return mocks.rpc(name,params);}}}));
import { listCustomerContacts, saveCustomerContact, deleteCustomerContact } from "@/lib/customer-contacts";

const ID="e1111111-1111-4111-8111-111111111111";
const valid={full_name:"مسؤول المشتريات",job_title:"المشتريات",phone:"+967777123456",email:"BUYER@EXAMPLE.COM",contact_type:"purchasing" as const,is_primary:true,is_active:true};

describe("customer company contact contract",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.args.splice(0);mocks.rpc.mockResolvedValue({data:ID,error:null});});
  it("loads own contacts without sending a customer id in customer mode",async()=>{
    const rows=[{id:ID,full_name:"مسؤول المشتريات",is_primary:true}];
    mocks.rpc.mockResolvedValueOnce({data:rows,error:null});
    await expect(listCustomerContacts()).resolves.toEqual(rows);
    expect(mocks.args[0]).toEqual({name:"list_customer_contacts",params:{p_customer_id:null}});
  });
  it("passes a scoped customer selector only for the admin workspace",async()=>{
    mocks.rpc.mockResolvedValueOnce({data:[],error:null});
    await expect(listCustomerContacts(ID)).resolves.toEqual([]);
    expect(mocks.args[0]).toEqual({name:"list_customer_contacts",params:{p_customer_id:ID}});
  });
  it("normalizes fields and sends no organization or profile identifiers",async()=>{
    await expect(saveCustomerContact({...valid,full_name:"  مسؤول المشتريات ",email:" BUYER@EXAMPLE.COM "})).resolves.toBe(ID);
    const call=mocks.args[0];
    expect(call.name).toBe("save_customer_contact");
    expect(call.params).toEqual({
      p_contact_id:null,p_customer_id:null,p_full_name:"مسؤول المشتريات",p_job_title:"المشتريات",
      p_phone:"+967777123456",p_email:"buyer@example.com",p_contact_type:"purchasing",p_is_primary:true,p_is_active:true,
    });
    expect(JSON.stringify(call.params)).not.toMatch(/organization_id|profile_id/i);
  });
  it("rejects incomplete contact methods and invalid e-mail before the RPC",async()=>{
    await expect(saveCustomerContact({...valid,phone:"",email:""})).rejects.toThrow("رقم هاتف أو بريد");
    await expect(saveCustomerContact({...valid,email:"bad-email"})).rejects.toThrow("صيغة البريد");
    await expect(saveCustomerContact({...valid,is_active:false,is_primary:true})).rejects.toThrow("غير نشطة");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("surfaces failures instead of claiming a contact was saved or deleted",async()=>{
    mocks.rpc.mockResolvedValueOnce({data:null,error:{message:"permission denied"}});
    await expect(saveCustomerContact(valid)).rejects.toThrow("permission denied");
    mocks.rpc.mockResolvedValueOnce({data:false,error:null});
    await expect(deleteCustomerContact(ID)).rejects.toThrow("لم يؤكد الخادم");
  });
});
