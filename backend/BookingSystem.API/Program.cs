using BookingSystem.API.Services;

const string CORS_POLICY_FRONTEND = "Cors_Policy_Frontend";
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<IAvailabilityService, AvailabilityService>();
builder.Services.AddControllers();

builder.Services.AddCors(opt =>
{
    opt.AddPolicy(name: CORS_POLICY_FRONTEND,
                policy =>
                    {
                        policy.WithOrigins("http://localhost:5173")
                            .AllowAnyHeader()
                            .AllowAnyMethod();
                    });
});

var app = builder.Build();

app.UseCors(CORS_POLICY_FRONTEND);

app.MapControllers();

app.Run();
