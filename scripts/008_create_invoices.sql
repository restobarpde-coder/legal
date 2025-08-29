-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(10,2) GENERATED ALWAYS AS (subtotal * tax_rate) STORED,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (subtotal + (subtotal * tax_rate)) STORED,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoice line items table
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  rate DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * rate) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "invoices_select_authenticated" ON public.invoices 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "invoices_insert_authenticated" ON public.invoices 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "invoices_update_authenticated" ON public.invoices 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "invoices_delete_authenticated" ON public.invoices 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for invoice line items
CREATE POLICY "invoice_line_items_select_authenticated" ON public.invoice_line_items 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "invoice_line_items_insert_authenticated" ON public.invoice_line_items 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "invoice_line_items_update_authenticated" ON public.invoice_line_items 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "invoice_line_items_delete_authenticated" ON public.invoice_line_items 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 4, '0');
END;
$$;

-- Trigger to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_invoice_number_trigger ON public.invoices;
CREATE TRIGGER set_invoice_number_trigger
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();
