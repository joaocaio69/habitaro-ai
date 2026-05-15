export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ClientIntent = 'buy' | 'rent' | 'sell' | 'buy_and_sell'
export type ClientStatus = 'lead' | 'active' | 'inactive' | 'converted' | 'lost'
export type LeadSource = 'referral' | 'portal' | 'instagram' | 'facebook' | 'google' | 'whatsapp' | 'cold_call' | 'event' | 'other'
export type TransactionType = 'sale' | 'rent' | 'sale_or_rent'
export type PropertyStatus = 'available' | 'negotiating' | 'sold' | 'rented' | 'inactive' | 'capturing'
export type DealStatus = 'open' | 'won' | 'lost' | 'paused'
export type ActivityType = 'call' | 'visit' | 'meeting' | 'task' | 'email' | 'whatsapp' | 'note'
export type ActivityStatus = 'pending' | 'completed' | 'cancelled'
export type UserRole = 'admin' | 'broker' | 'manager'

export interface Agency {
  id: string
  name: string
  cnpj: string | null
  logo_url: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  agency_id: string | null
  full_name: string
  phone: string | null
  creci: string | null
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  agency_id: string
  broker_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  cpf: string | null
  intent: ClientIntent | null
  status: ClientStatus
  source: LeadSource | null
  budget_min: number | null
  budget_max: number | null
  notes: string | null
  preferred_type: string | null
  preferred_location: string | null
  preferred_bedrooms: number | null
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  agency_id: string
  broker_id: string | null
  type_id: number | null
  transaction_type: TransactionType
  status: PropertyStatus
  title: string
  description: string | null
  internal_code: string | null
  is_exclusive: boolean
  zip_code: string | null
  address: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  price: number | null
  condo_fee: number | null
  iptu_yearly: number | null
  area_total: number | null
  area_useful: number | null
  bedrooms: number | null
  suites: number | null
  bathrooms: number | null
  parking_spots: number | null
  floor: number | null
  total_floors: number | null
  amenities: string[]
  owner_name: string | null
  owner_phone: string | null
  owner_email: string | null
  created_at: string
  updated_at: string
}

export interface PropertyImage {
  id: string
  property_id: string
  url: string
  is_cover: boolean
  sort_order: number
  created_at: string
}

export interface PropertyType {
  id: number
  name: string
}

export interface ClientPropertyInterest {
  client_id: string
  property_id: string
  notes: string | null
  created_at: string
}

export interface PropertyWithRelations extends Property {
  property_types: PropertyType | null
  property_images: PropertyImage[]
}

export interface PipelineStage {
  id: string
  agency_id: string
  name: string
  sort_order: number
  color: string
  is_won: boolean
  is_lost: boolean
  created_at: string
}

export interface Deal {
  id: string
  agency_id: string
  client_id: string
  property_id: string | null
  broker_id: string | null
  stage_id: string
  status: DealStatus
  title: string
  value: number | null
  commission_pct: number | null
  commission_value: number | null
  expected_close_date: string | null
  closed_at: string | null
  lost_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  agency_id: string
  broker_id: string | null
  deal_id: string | null
  client_id: string | null
  property_id: string | null
  type: ActivityType
  status: ActivityStatus
  title: string
  description: string | null
  scheduled_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Tag {
  id: string
  agency_id: string
  name: string
  color: string
  created_at: string
}
