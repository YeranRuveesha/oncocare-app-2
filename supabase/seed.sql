-- ════════════════════════════════════════════════════════════════════
-- OncoCare BMT · 30 Sri Lankan hospitals for the demo (DEMO DATA ONLY)
--
-- The hospital NAMES are real institutions. Everything else is a PLACEHOLDER:
-- registration numbers (DEMO-HOSP-001...), phone numbers (+9411000xxxx),
-- emails (...@example.com), addresses and colours are made up. Replace them
-- with real details before any real use.
--
-- Hosted Supabase: SQL Editor > New query > paste this file > Run.
-- Local: runs by itself on `npx supabase db reset` (it is supabase/seed.sql).
-- Safe to run twice: existing hospitals are skipped.
--
-- Every hospital starts as "Awaiting admin setup". It becomes Active (and shows
-- in the sign-up lists) after you add its first Hospital Admin in the app:
-- Admin > Hospital admins > Add, then that person activates the account.
-- ════════════════════════════════════════════════════════════════════

insert into public.hospitals
  (code, name, short_name, registration_no, type, address_line, city, district, country, email, phone, primary_color, secondary_color)
values
  ('SLH001', 'National Hospital of Sri Lanka', 'NHSL', 'DEMO-HOSP-001', 'Teaching', 'Regent Street, Colombo 10', 'Colombo', 'Colombo', 'Sri Lanka', 'info@national-hospital-of-sri-lanka.example.com', '+94110000001', '#0F4C81', '#1B7A7E'),
  ('SLH002', 'Teaching Hospital Kandy', 'THK', 'DEMO-HOSP-002', 'Teaching', 'William Gopallawa Mawatha, Kandy', 'Kandy', 'Kandy', 'Sri Lanka', 'info@teaching-hospital-kandy.example.com', '+94110000002', '#14532D', '#0F766E'),
  ('SLH003', 'Teaching Hospital Peradeniya', 'THP', 'DEMO-HOSP-003', 'Teaching', 'Peradeniya Road, Peradeniya', 'Peradeniya', 'Kandy', 'Sri Lanka', 'info@teaching-hospital-peradeniya.example.com', '+94110000003', '#1E3A8A', '#0E7490'),
  ('SLH004', 'Teaching Hospital Karapitiya', 'THKP', 'DEMO-HOSP-004', 'Teaching', 'Karapitiya, Galle', 'Galle', 'Galle', 'Sri Lanka', 'info@teaching-hospital-karapitiya.example.com', '+94110000004', '#7C2D12', '#0F766E'),
  ('SLH005', 'Teaching Hospital Jaffna', 'THJ', 'DEMO-HOSP-005', 'Teaching', 'Hospital Road, Jaffna', 'Jaffna', 'Jaffna', 'Sri Lanka', 'info@teaching-hospital-jaffna.example.com', '+94110000005', '#0F4C81', '#B45309'),
  ('SLH006', 'Teaching Hospital Anuradhapura', 'THA', 'DEMO-HOSP-006', 'Teaching', 'Hospital Road, Anuradhapura', 'Anuradhapura', 'Anuradhapura', 'Sri Lanka', 'info@teaching-hospital-anuradhapura.example.com', '+94110000006', '#4C1D95', '#1B7A7E'),
  ('SLH007', 'Teaching Hospital Batticaloa', 'THB', 'DEMO-HOSP-007', 'Teaching', 'Hospital Road, Batticaloa', 'Batticaloa', 'Batticaloa', 'Sri Lanka', 'info@teaching-hospital-batticaloa.example.com', '+94110000007', '#0C4A6E', '#15803D'),
  ('SLH008', 'Teaching Hospital Kurunegala', 'THKG', 'DEMO-HOSP-008', 'Teaching', 'Hospital Road, Kurunegala', 'Kurunegala', 'Kurunegala', 'Sri Lanka', 'info@teaching-hospital-kurunegala.example.com', '+94110000008', '#1E293B', '#0F766E'),
  ('SLH009', 'Teaching Hospital Ratnapura', 'THR', 'DEMO-HOSP-009', 'Teaching', 'Hospital Road, Ratnapura', 'Ratnapura', 'Ratnapura', 'Sri Lanka', 'info@teaching-hospital-ratnapura.example.com', '+94110000009', '#831843', '#0E7490'),
  ('SLH010', 'Colombo North Teaching Hospital Ragama', 'CNTH', 'DEMO-HOSP-010', 'Teaching', 'Ragama', 'Ragama', 'Gampaha', 'Sri Lanka', 'info@colombo-north-teaching-hospital-ragama.example.com', '+94110000010', '#0F4C81', '#1B7A7E'),
  ('SLH011', 'Colombo South Teaching Hospital Kalubowila', 'CSTH', 'DEMO-HOSP-011', 'Teaching', 'Kalubowila, Dehiwala', 'Dehiwala', 'Colombo', 'Sri Lanka', 'info@colombo-south-teaching-hospital-kalubowila.example.com', '+94110000011', '#134E4A', '#1D4ED8'),
  ('SLH012', 'Sri Jayewardenepura General Hospital', 'SJGH', 'DEMO-HOSP-012', 'Teaching', 'Thalapathpitiya, Nugegoda', 'Kotte', 'Colombo', 'Sri Lanka', 'info@sri-jayewardenepura-general-hospital.example.com', '+94110000012', '#1E3A8A', '#15803D'),
  ('SLH013', 'Lady Ridgeway Hospital for Children', 'LRH', 'DEMO-HOSP-013', 'Government', 'Dr. Danister De Silva Mawatha, Colombo 8', 'Colombo', 'Colombo', 'Sri Lanka', 'info@lady-ridgeway-hospital-for-children.example.com', '+94110000013', '#7E22CE', '#0F766E'),
  ('SLH014', 'De Soysa Hospital for Women', 'DSHW', 'DEMO-HOSP-014', 'Government', 'Kynsey Road, Colombo 8', 'Colombo', 'Colombo', 'Sri Lanka', 'info@de-soysa-hospital-for-women.example.com', '+94110000014', '#9D174D', '#0E7490'),
  ('SLH015', 'Castle Street Hospital for Women', 'CSHW', 'DEMO-HOSP-015', 'Government', 'Castle Street, Colombo 8', 'Colombo', 'Colombo', 'Sri Lanka', 'info@castle-street-hospital-for-women.example.com', '+94110000015', '#BE123C', '#1B7A7E'),
  ('SLH016', 'National Cancer Institute Apeksha Hospital', 'APEKSHA', 'DEMO-HOSP-016', 'Government', 'High Level Road, Maharagama', 'Maharagama', 'Colombo', 'Sri Lanka', 'info@national-cancer-institute-apeksha-hospital.example.com', '+94110000016', '#0F4C81', '#DC2626'),
  ('SLH017', 'Base Hospital Gampaha', 'BHG', 'DEMO-HOSP-017', 'Government', 'Hospital Road, Gampaha', 'Gampaha', 'Gampaha', 'Sri Lanka', 'info@base-hospital-gampaha.example.com', '+94110000017', '#14532D', '#1B7A7E'),
  ('SLH018', 'Provincial General Hospital Matara', 'PGHM', 'DEMO-HOSP-018', 'Government', 'Hospital Road, Matara', 'Matara', 'Matara', 'Sri Lanka', 'info@provincial-general-hospital-matara.example.com', '+94110000018', '#0F4C81', '#0F766E'),
  ('SLH019', 'Provincial General Hospital Badulla', 'PGHB', 'DEMO-HOSP-019', 'Government', 'Hospital Road, Badulla', 'Badulla', 'Badulla', 'Sri Lanka', 'info@provincial-general-hospital-badulla.example.com', '+94110000019', '#365314', '#0E7490'),
  ('SLH020', 'General Hospital Hambantota', 'GHH', 'DEMO-HOSP-020', 'Government', 'Hospital Road, Hambantota', 'Hambantota', 'Hambantota', 'Sri Lanka', 'info@general-hospital-hambantota.example.com', '+94110000020', '#7C2D12', '#1B7A7E'),
  ('SLH021', 'General Hospital Trincomalee', 'GHT', 'DEMO-HOSP-021', 'Government', 'Hospital Road, Trincomalee', 'Trincomalee', 'Trincomalee', 'Sri Lanka', 'info@general-hospital-trincomalee.example.com', '+94110000021', '#0C4A6E', '#0F766E'),
  ('SLH022', 'Nawaloka Hospital', 'NAWALOKA', 'DEMO-HOSP-022', 'Private', 'Deshamanya H.K. Dharmadasa Mawatha, Colombo 2', 'Colombo', 'Colombo', 'Sri Lanka', 'info@nawaloka-hospital.example.com', '+94110000022', '#991B1B', '#1B7A7E'),
  ('SLH023', 'Durdans Hospital', 'DURDANS', 'DEMO-HOSP-023', 'Private', 'Alfred Place, Colombo 3', 'Colombo', 'Colombo', 'Sri Lanka', 'info@durdans-hospital.example.com', '+94110000023', '#1E3A8A', '#0E7490'),
  ('SLH024', 'Lanka Hospitals', 'LANKA', 'DEMO-HOSP-024', 'Private', 'Kirula Road, Colombo 5', 'Colombo', 'Colombo', 'Sri Lanka', 'info@lanka-hospitals.example.com', '+94110000024', '#0F4C81', '#15803D'),
  ('SLH025', 'Asiri Central Hospital', 'ASIRIC', 'DEMO-HOSP-025', 'Private', 'Norris Canal Road, Colombo 10', 'Colombo', 'Colombo', 'Sri Lanka', 'info@asiri-central-hospital.example.com', '+94110000025', '#0F766E', '#0F4C81'),
  ('SLH026', 'Asiri Surgical Hospital', 'ASIRIS', 'DEMO-HOSP-026', 'Private', 'Kirimandala Mawatha, Colombo 5', 'Colombo', 'Colombo', 'Sri Lanka', 'info@asiri-surgical-hospital.example.com', '+94110000026', '#134E4A', '#B45309'),
  ('SLH027', 'Hemas Hospital Wattala', 'HEMASW', 'DEMO-HOSP-027', 'Private', 'Negombo Road, Wattala', 'Wattala', 'Gampaha', 'Sri Lanka', 'info@hemas-hospital-wattala.example.com', '+94110000027', '#1E293B', '#1B7A7E'),
  ('SLH028', 'Ninewells Hospital', 'NINEWELLS', 'DEMO-HOSP-028', 'Private', 'Kirula Road, Colombo 5', 'Colombo', 'Colombo', 'Sri Lanka', 'info@ninewells-hospital.example.com', '+94110000028', '#4C1D95', '#0E7490'),
  ('SLH029', 'Hemas Hospital Thalawathugoda', 'HEMASTH', 'DEMO-HOSP-029', 'Private', 'Thalawathugoda', 'Thalawathugoda', 'Colombo', 'Sri Lanka', 'info@hemas-hospital-thalawathugoda.example.com', '+94110000029', '#0F4C81', '#0F766E'),
  ('SLH030', 'Oasis Hospital Colombo', 'OASIS', 'DEMO-HOSP-030', 'Private', 'Colombo', 'Colombo', 'Colombo', 'Sri Lanka', 'info@oasis-hospital-colombo.example.com', '+94110000030', '#0C4A6E', '#1B7A7E')
on conflict do nothing;

-- Check: should show 30 (plus any hospitals you made yourself).
select count(*) as sri_lanka_demo_hospitals from public.hospitals where registration_no like 'DEMO-HOSP-%';
