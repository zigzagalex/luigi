export type CustomerProfile = {
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
  
    address1: string;
    address2: string;
    postal_code: string;
    city: string;
    country: string;
  
    notes: string;
  };
  
  export const emptyCustomerProfile: CustomerProfile = {
    email: "",
    phone: "",
    first_name: "",
    last_name: "",
  
    address1: "",
    address2: "",
    postal_code: "",
    city: "",
    country: "CH",
  
    notes: "",
  };
  