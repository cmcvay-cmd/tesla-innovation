-- Update models with current official Tesla starting prices and refined blurbs (2026).
-- Prices are US anchors before destination/order fees, taxes, and options.

update models set
  anchor_cents = 3699000,
  range_mi = 321,
  zero_to_sixty = '5.8s',
  blurb = 'Standard Rear-Wheel Drive. The everyday sedan. 321 miles EPA est., quiet cabin, and the lowest door into the current lineup.'
where id = 'model-3';

update models set
  anchor_cents = 3999000,
  range_mi = 321,
  zero_to_sixty = '6.8s',
  blurb = 'Standard Rear-Wheel Drive. The volume crossover most people mean when they say Tesla. 321 miles EPA est.'
where id = 'model-y';

update models set
  anchor_cents = 7499000,
  range_mi = 325,
  zero_to_sixty = '4.1s',
  blurb = 'Dual Motor All-Wheel Drive. Stainless exterior, 325 miles EPA est., up to 11,000 lbs towing. The utility truck.'
where id = 'cybertruck';

update models set
  blurb = 'Long Range. A thinner allocation than the volume cars. Ask the desk what can still be placed.'
where id = 'model-s';

update models set
  blurb = 'Falcon-wing doors and three rows, on the same thin allocation as Model S.'
where id = 'model-x';
