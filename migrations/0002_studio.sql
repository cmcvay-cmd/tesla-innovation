-- Tesla Innovation studio: lineup, allocations, private concierge threads.

create table if not exists profiles (
  user_id text primary key,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create table if not exists models (
  id text primary key,
  name text not null,
  tagline text not null,
  kind text not null,
  image text not null,
  anchor_cents integer not null,
  range_mi integer,
  zero_to_sixty text not null default '',
  drive text not null,
  status text not null,
  quote_mode text not null,
  blurb text not null,
  sort_order integer not null
);

create table if not exists plans (
  id text primary key,
  name text not null,
  horizon_months integer not null,
  min_cents integer not null,
  apr_bps integer not null,
  risk text not null,
  summary text not null,
  active boolean not null default true,
  sort_order integer not null
);

create table if not exists reservations (
  id serial primary key,
  user_id text not null,
  model_id text not null references models (id),
  color text not null,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);

create index if not exists reservations_user_idx on reservations (user_id);

create table if not exists investments (
  id serial primary key,
  user_id text not null,
  plan_id text not null references plans (id),
  amount_cents integer not null,
  status text not null default 'pending',
  opened_at timestamptz not null default now()
);

create index if not exists investments_user_idx on investments (user_id);

create table if not exists messages (
  id serial primary key,
  user_id text not null,
  sender_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx on messages (user_id, id);

insert into models (
  id, name, tagline, kind, image, anchor_cents, range_mi, zero_to_sixty, drive, status, quote_mode, blurb, sort_order
) values
  (
    'model-3', 'Model 3', 'The efficient sedan.', 'Sedan', '/fleet/model-3.jpg',
    3699000, 321, '5.8s', 'Rear-wheel drive', 'available', 'live',
    'Standard trim. The quiet daily sedan, 321 miles, and the lowest door into the lineup.',
    1
  ),
  (
    'model-y', 'Model Y', 'The volume crossover.', 'SUV', '/fleet/model-y.jpg',
    3999000, 321, '6.8s', 'Rear-wheel drive', 'available', 'live',
    'Standard rear-wheel drive. The refreshed crossover most people mean when they say Tesla.',
    2
  ),
  (
    'model-yl', 'Model Y L', 'Six seats, stretched cabin.', 'SUV', '/fleet/model-yl.jpg',
    6199000, 325, '4.4s', 'All-wheel drive', 'available', 'live',
    'Launch Series. A longer wheelbase and six seats, with deliveries moving this season.',
    3
  ),
  (
    'model-s', 'Model S', 'The low fastback.', 'Sedan', '/fleet/model-s.jpg',
    7999000, null, '3.1s', 'All-wheel drive', 'limited', 'live',
    'Long Range. A thinner allocation than the volume cars. Ask the desk what can still be placed.',
    4
  ),
  (
    'model-x', 'Model X', 'Falcon doors, three rows.', 'SUV', '/fleet/model-x.jpg',
    8499000, null, '3.8s', 'All-wheel drive', 'limited', 'live',
    'Falcon-wing doors and three rows, on the same thin allocation as Model S.',
    5
  ),
  (
    'cybertruck', 'Cybertruck', 'Stainless, dual motor.', 'Truck', '/fleet/cybertruck.jpg',
    7499000, 325, '4.1s', 'All-wheel drive', 'available', 'live',
    'Dual Motor all-wheel drive. 325 miles. The US anchor stepped up in August 2026.',
    6
  ),
  (
    'cybercab', 'Cybercab', 'Two-seat robotaxi.', 'Robotaxi', '/fleet/cybercab.jpg',
    2999000, null, '', 'Autonomous fleet', 'coming', 'target',
    'Fleet rides are live in a handful of cities. The figure is a published target, not an open retail price.',
    7
  ),
  (
    'roadster', 'Roadster', 'The October reveal.', 'Sports', '/fleet/roadster.jpg',
    25000000, null, '', 'Halo', 'coming', 'signal',
    'Revealed in October 2026. The figure is a founders signal until a public configurator exists.',
    8
  );

insert into plans (
  id, name, horizon_months, min_cents, apr_bps, risk, summary, active, sort_order
) values
  (
    'charge', 'Charge', 12, 50000, 650, 'Guarded',
    'A short sleeve. Capital stays close to the desk and only goes live after review.',
    true, 1
  ),
  (
    'dual-motor', 'Dual Motor', 24, 250000, 1100, 'Balanced',
    'A two-year book across vehicle demand and the innovation sleeve.',
    true, 2
  ),
  (
    'plaid', 'Plaid', 36, 1000000, 1650, 'Ambitious',
    'A longer pace. The illustrative mark moves faster, and so does the swing.',
    true, 3
  ),
  (
    'founders', 'Founders', 48, 5000000, 1900, 'Concentrated',
    'The longest horizon on the desk. Concentrated, and reviewed by hand.',
    true, 4
  );
