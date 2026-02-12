-- Enable realtime for messages and scenarios tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_scenarios;