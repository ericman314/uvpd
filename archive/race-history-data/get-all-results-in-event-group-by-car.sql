use pinewood;
select * FROM Results JOIN Events on Events.EventId = Results.EventId JOIN Cars on Results.carId = Cars.carId where Events.hidden = 0 