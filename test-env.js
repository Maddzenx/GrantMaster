const mask = (key) => key ? key.slice(0, 6) + '...' + key.slice(-4) : 'NOT SET';

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET');
console.log('Supabase Anon Key:', mask(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
console.log('OpenAI API Key:', mask(process.env.OPENAI_API_KEY));
console.log('Vinnova Calls Endpoint:', process.env.VINNOVA_CALLS_ENDPOINT || 'NOT SET');
console.log('Vinnova Activities Endpoint:', process.env.VINNOVA_ACTIVITIES_ENDPOINT || 'NOT SET');
console.log('Vinnova Applications Endpoint:', process.env.VINNOVA_APPLICATIONS_ENDPOINT || 'NOT SET');
console.log('Anthropic API Key:', mask(process.env.ANTHROPIC_API_KEY));
console.log('Perplexity API Key:', mask(process.env.PERPLEXITY_API_KEY)); 