INSERT INTO public.settings (key, value)
VALUES (
  'whatsapp_order_template',
  'Ola! Gostaria de confirmar meu pedido #{{code}} no catalogo DZAMP:

{{items}}

{{subtotal_line}}
{{discount_line}}
Total do Pedido: {{total}}'
)
ON CONFLICT (key) DO NOTHING;
