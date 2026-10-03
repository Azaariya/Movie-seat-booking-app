
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w500";

const regularPrice = 120;
const vipPrice = 200;
const MAX_SEATS = 5;
const STORAGE_KEY = "cinemaSeatsV2";

const defaultShowtimes = ["2:00 PM", "5:00 PM", "8:30 PM"];

// ===============================
// TMDB API
// ===============================

async function fetchMovies() {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/popular?language=en-US&page=1`,
    {
      headers: {
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
        accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  const data = await response.json();

  return data.results
    .filter((movie) => movie.title)
    .map((movie) => ({
      id: movie.id,
      name: movie.title,
      price: regularPrice,

      poster: movie.poster_path
        ? `${TMDB_IMAGE_URL}${movie.poster_path}`
        : "",

      backdrop: movie.backdrop_path
        ? `${TMDB_IMAGE_URL}${movie.backdrop_path}`
        : "",

      overview:
        movie.overview || "No description available.",

      rating: movie.vote_average || 0,

      releaseDate:
        movie.release_date || "Unknown"
    }));
}

async function searchMovies(query) {
  const response = await fetch(
    `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(
      query
    )}&language=en-US&page=1`,
    {
      headers: {
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
        accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`TMDB search failed: ${response.status}`);
  }

  const data = await response.json();

  return data.results
    .filter((movie) => movie.title)
    .map((movie) => ({
      id: movie.id,
      name: movie.title,
      price: regularPrice,

      poster: movie.poster_path
        ? `${TMDB_IMAGE_URL}${movie.poster_path}`
        : "",

      backdrop: movie.backdrop_path
        ? `${TMDB_IMAGE_URL}${movie.backdrop_path}`
        : "",

      overview:
        movie.overview || "No description available.",

      rating: movie.vote_average || 0,

      releaseDate:
        movie.release_date || "Unknown"
    }));
}

// ===============================
// SHOWTIMES
// ===============================

// TMDB provides movie information,
// not your cinema's actual showtimes.
//
// So we generate demo showtimes locally.
function getShowtimes(movie) {
  const offset = movie.id % defaultShowtimes.length;

  return defaultShowtimes.map(
    (_, index) =>
      defaultShowtimes[
      (index + offset) % defaultShowtimes.length
      ]
  );
}

// ===============================
// SEATS
// ===============================

function createRegularSeats() {
  const seats = [];

  const rows = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H"
  ];

  let id = 1;

  rows.forEach((row) => {
    for (let number = 1; number <= 8; number++) {
      seats.push({
        id,
        name: `${row}${number}`,
        type: "regular",
        occupied: false
      });

      id++;
    }
  });

  return seats;
}

function createVipSeats() {
  const seats = [];

  const rows = [
    "VIP-A",
    "VIP-B"
  ];

  let id = 101;

  rows.forEach((row) => {
    for (let number = 1; number <= 6; number++) {
      seats.push({
        id,
        name: `${row}${number}`,
        type: "vip",
        occupied: false
      });

      id++;
    }
  });

  return seats;
}

function createMovieSeats(movieList) {
  const seats = {};

  movieList.forEach((movie) => {
    seats[movie.id] = {};

    getShowtimes(movie).forEach((time) => {
      seats[movie.id][time] = {
        regular: createRegularSeats(),
        vip: createVipSeats()
      };
    });
  });

  return seats;
}

function getSavedSeats(movieList) {
  const savedSeats =
    localStorage.getItem(STORAGE_KEY);

  if (savedSeats) {
    const parsedSeats = JSON.parse(savedSeats);

    const newSeats =
      createMovieSeats(movieList);

    Object.keys(parsedSeats).forEach(
      (movieId) => {
        if (!newSeats[movieId]) {
          return;
        }

        Object.keys(
          parsedSeats[movieId]
        ).forEach((time) => {
          if (newSeats[movieId][time]) {
            newSeats[movieId][time] =
              parsedSeats[movieId][time];
          }
        });
      }
    );

    return newSeats;
  }

  return createMovieSeats(movieList);
}

// ===============================
// DATES
// ===============================

function getDateOptions() {
  const dates = [];

  for (let i = 0; i < 3; i++) {
    const date = new Date();

    date.setDate(
      date.getDate() + i
    );

    dates.push({
      value: date
        .toISOString()
        .split("T")[0],

      label:
        i === 0
          ? "Today"
          : i === 1
            ? "Tomorrow"
            : date.toLocaleDateString(
              "en-US",
              {
                weekday: "long"
              }
            ),

      fullDate:
        date.toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
            year: "numeric"
          }
        )
    });
  }

  return dates;
}

// ===============================
// BOOKING ID
// ===============================

function generateBookingId() {
  return `CMX-${Math.floor(
    100000 + Math.random() * 900000
  )}`;
}

// ===============================
// APP
// ===============================

function App() {
  const dateOptions =
    getDateOptions();

  const [movies, setMovies] =
    React.useState([]);

  const [selectedMovie, setSelectedMovie] =
    React.useState(null);

  const [selectedDate, setSelectedDate] =
    React.useState(
      dateOptions[0].value
    );

  const [selectedShowtime, setSelectedShowtime] =
    React.useState("");

  const [seatType, setSeatType] =
    React.useState("regular");

  const [selectedSeats, setSelectedSeats] =
    React.useState([]);

  const [seats, setSeats] =
    React.useState({});

  const [seatError, setSeatError] =
    React.useState("");

  const [booking, setBooking] =
    React.useState(null);

  const [loading, setLoading] =
    React.useState(true);

  const [error, setError] =
    React.useState("");

  const [searchTerm, setSearchTerm] =
    React.useState("");

  const [searchLoading, setSearchLoading] =
    React.useState(false);

  // ===============================
  // LOAD MOVIES
  // ===============================

  React.useEffect(() => {
    loadMovies();
  }, []);

  // ===============================
  // SAVE SEATS
  // ===============================

  React.useEffect(() => {
    if (
      Object.keys(seats).length > 0
    ) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(seats)
      );
    }
  }, [seats]);

  async function loadMovies() {
    try {
      setLoading(true);
      setError("");

      const movieList =
        await fetchMovies();

      setMovies(movieList);

      if (movieList.length > 0) {
        const firstMovie =
          movieList[0];

        const firstShowtime =
          getShowtimes(
            firstMovie
          )[0];

        setSelectedMovie(
          firstMovie
        );

        setSelectedShowtime(
          firstShowtime
        );

        setSeats(
          getSavedSeats(
            movieList
          )
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        "Could not load movies from TMDB. Check your API key and internet connection."
      );
    } finally {
      setLoading(false);
    }
  }

  // ===============================
  // CURRENT SEATS
  // ===============================

  const currentSeats =
    selectedMovie &&
      selectedShowtime
      ? seats[
      selectedMovie.id
      ]?.[
      selectedShowtime
      ]?.[seatType] || []
      : [];

  const currentDate =
    dateOptions.find(
      (date) =>
        date.value ===
        selectedDate
    );

  const pricePerSeat =
    seatType === "vip"
      ? vipPrice
      : regularPrice;

  const selectedSeatObjects =
    currentSeats.filter(
      (seat) =>
        selectedSeats.includes(
          seat.id
        )
    );

  const total =
    selectedSeats.length *
    pricePerSeat;

  // ===============================
  // MOVIE CHANGE
  // ===============================

  function handleMovieChange(
    movieId
  ) {
    const movie =
      movies.find(
        (item) =>
          item.id ===
          Number(movieId)
      );

    if (!movie) {
      return;
    }

    const firstShowtime =
      getShowtimes(
        movie
      )[0];

    setSelectedMovie(
      movie
    );

    setSelectedShowtime(
      firstShowtime
    );

    setSelectedSeats([]);

    setSeatError("");

    setBooking(null);
  }

  // ===============================
  // DATE CHANGE
  // ===============================

  function handleDateChange(
    date
  ) {
    setSelectedDate(
      date
    );

    setSelectedSeats([]);

    setSeatError("");

    setBooking(null);
  }

  // ===============================
  // SHOWTIME CHANGE
  // ===============================

  function handleShowtimeChange(
    time
  ) {
    setSelectedShowtime(
      time
    );

    setSelectedSeats([]);

    setSeatError("");

    setBooking(null);
  }

  // ===============================
  // SEAT TYPE
  // ===============================

  function handleSeatTypeChange(
    type
  ) {
    setSeatType(type);

    setSelectedSeats([]);

    setSeatError("");

    setBooking(null);
  }

  // ===============================
  // SEAT CLICK
  // ===============================

  function handleSeatClick(
    seatId
  ) {
    setSelectedSeats(
      (previousSeats) => {
        if (
          previousSeats.includes(
            seatId
          )
        ) {
          setSeatError("");

          return previousSeats.filter(
            (id) =>
              id !== seatId
          );
        }

        if (
          previousSeats.length >=
          MAX_SEATS
        ) {
          setSeatError(
            `You can only select a maximum of ${MAX_SEATS} seats.`
          );

          return previousSeats;
        }

        setSeatError("");

        return [
          ...previousSeats,
          seatId
        ];
      }
    );
  }

  // ===============================
  // BOOKING
  // ===============================

  function handleBooking() {
    if (!selectedMovie) {
      return;
    }

    if (
      selectedSeats.length === 0
    ) {
      setSeatError(
        "Please select at least one seat."
      );

      return;
    }

    const seatsToBook =
      currentSeats.filter(
        (seat) =>
          selectedSeats.includes(
            seat.id
          )
      );

    const bookingData = {
      id: generateBookingId(),

      movie:
        selectedMovie.name,

      poster:
        selectedMovie.poster,

      date:
        currentDate.fullDate,

      dateValue:
        selectedDate,

      showtime:
        selectedShowtime,

      seatType,

      seats:
        seatsToBook,

      total,

      createdAt:
        new Date().toLocaleString()
    };

    setSeats(
      (previousSeats) => ({
        ...previousSeats,

        [selectedMovie.id]: {
          ...previousSeats[
          selectedMovie.id
          ],

          [selectedShowtime]: {
            ...previousSeats[
            selectedMovie.id
            ][selectedShowtime],

            [seatType]:
              previousSeats[
                selectedMovie.id
              ][selectedShowtime][
                seatType
              ].map((seat) =>
                selectedSeats.includes(
                  seat.id
                )
                  ? {
                    ...seat,
                    occupied:
                      true
                  }
                  : seat
              )
          }
        }
      })
    );

    setBooking(
      bookingData
    );

    setSelectedSeats([]);

    setSeatError("");
  }

  // ===============================
  // RESET SEATS
  // ===============================

  function handleResetStorage() {
    if (
      movies.length === 0
    ) {
      return;
    }

    const newSeats =
      createMovieSeats(
        movies
      );

    setSeats(
      newSeats
    );

    setSelectedSeats([]);

    setBooking(null);

    setSeatError("");

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        newSeats
      )
    );
  }

  // ===============================
  // PRINT
  // ===============================

  function handlePrintTicket() {
    window.print();
  }

  // ===============================
  // SEARCH
  // ===============================

  async function handleSearch(
    event
  ) {
    event.preventDefault();

    if (
      !searchTerm.trim()
    ) {
      loadMovies();
      return;
    }

    try {
      setSearchLoading(
        true
      );

      setError("");

      const results =
        await searchMovies(
          searchTerm.trim()
        );

      if (
        results.length === 0
      ) {
        setError(
          "No movies found for that search."
        );

        return;
      }

      setMovies(
        results
      );

      const firstMovie =
        results[0];

      setSelectedMovie(
        firstMovie
      );

      setSelectedShowtime(
        getShowtimes(
          firstMovie
        )[0]
      );

      setSelectedSeats([]);

      setBooking(null);

      setSeats(
        (previousSeats) => {
          const newSeats =
            createMovieSeats(
              results
            );

          return {
            ...newSeats,
            ...previousSeats
          };
        }
      );
    } catch (err) {
      console.error(err);

      setError(
        "Movie search failed. Please try again."
      );
    } finally {
      setSearchLoading(
        false
      );
    }
  }

  // ===============================
  // LOADING SCREEN
  // ===============================

  if (loading) {
    return (
      <div className="cinema-app loading-screen">
        <div>
          <div className="brand-icon">
            🎬
          </div>

          <h1>
            Loading Movies...
          </h1>

          <p>
            Getting movies from TMDB.
          </p>
        </div>
      </div>
    );
  }

  // ===============================
  // ERROR SCREEN
  // ===============================

  if (
    error &&
    movies.length === 0
  ) {
    return (
      <div className="cinema-app loading-screen">
        <div>
          <div className="brand-icon">
            ⚠️
          </div>

          <h1>
            Unable to Load Movies
          </h1>

          <p>
            {error}
          </p>

          <button
            className="confirm-button"
            onClick={
              loadMovies
            }
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!selectedMovie) {
    return null;
  }

  const movieShowtimes =
    getShowtimes(
      selectedMovie
    );

  // ===============================
  // UI
  // ===============================

  return (
    <div className="cinema-app">

      <header className="cinema-header">

        <div className="brand">

          <div className="brand-icon">
            🎬
          </div>

          <div>
            <h1>
              CineMax
            </h1>

            <p>
              Premium Cinema Experience
            </p>
          </div>

        </div>

        {/* SEARCH */}

        <form
          className="movie-search"
          onSubmit={
            handleSearch
          }
        >

          <input
            type="text"
            placeholder="Search movies..."
            value={
              searchTerm
            }
            onChange={(
              event
            ) =>
              setSearchTerm(
                event.target.value
              )
            }
          />

          <button
            type="submit"
            disabled={
              searchLoading
            }
          >
            {searchLoading
              ? "..."
              : "Search"}
          </button>

        </form>

        {/* MOVIE SELECTOR */}

        <MovieSelector
          selectedMovie={
            selectedMovie.id
          }
          setSelectedMovie={
            handleMovieChange
          }
          movies={
            movies
          }
        />

      </header>

      <main className="cinema-container">

        <section className="booking-area">

          <div className="section-heading">

            <div>

              <span className="small-title">
                NOW SHOWING
              </span>

              <h2>
                {selectedMovie.name}
              </h2>

            </div>

            <div className="seat-limit">
              {
                selectedSeats.length
              }
              /5 seats
            </div>

          </div>

          {error && (
            <p className="seat-error">
              {error}
            </p>
          )}

          {/* TMDB MOVIE INFORMATION */}

          <div className="movie-api-info">

            {selectedMovie.poster && (
              <img
                src={
                  selectedMovie.poster
                }
                alt={
                  selectedMovie.name
                }
                className="movie-poster"
              />
            )}

            <div>

              <div className="movie-rating">
                ⭐{" "}
                {selectedMovie.rating.toFixed(
                  1
                )}{" "}
                / 10
              </div>

              <p>
                {
                  selectedMovie.overview
                }
              </p>

              <small>
                Release date:{" "}
                {
                  selectedMovie.releaseDate
                }
              </small>

            </div>

          </div>

          {/* DATE */}

          <DateSelector
            dates={
              dateOptions
            }
            selectedDate={
              selectedDate
            }
            setSelectedDate={
              handleDateChange
            }
          />

          {/* SHOWTIME */}

          <ShowtimeSelector
            times={
              movieShowtimes
            }
            selectedShowtime={
              selectedShowtime
            }
            setSelectedShowtime={
              handleShowtimeChange
            }
          />

          {/* SEAT TYPE */}

          <SeatTypeSelector
            seatType={
              seatType
            }
            setSeatType={
              handleSeatTypeChange
            }
          />

          {/* SCREEN */}

          <div className="screen-container">

            <div className="screen">
              <span>
                SCREEN
              </span>
            </div>

          </div>

          {/* SEATS */}

          <SeatLayout
            seats={
              currentSeats
            }
            selectedSeats={
              selectedSeats
            }
            handleSeatClick={
              handleSeatClick
            }
            seatType={
              seatType
            }
          />

          {/* LEGEND */}

          <div className="seat-legend">

            <div className="legend-item">
              <span className="legend-seat"></span>
              <span>
                Available
              </span>
            </div>

            <div className="legend-item">
              <span className="legend-seat selected"></span>
              <span>
                Selected
              </span>
            </div>

            <div className="legend-item">
              <span className="legend-seat occupied"></span>
              <span>
                Occupied
              </span>
            </div>

            <div className="legend-item">
              <span className="legend-seat vip"></span>
              <span>
                VIP
              </span>
            </div>

          </div>

        </section>

        {/* BOOKING SUMMARY */}

        <BookingSummary
          movie={
            selectedMovie
          }
          selectedDate={
            currentDate
          }
          selectedShowtime={
            selectedShowtime
          }
          seatType={
            seatType
          }
          selectedSeats={
            selectedSeatObjects
          }
          pricePerSeat={
            pricePerSeat
          }
          total={
            total
          }
          handleBooking={
            handleBooking
          }
          seatError={
            seatError
          }
          booking={
            booking
          }
          handlePrintTicket={
            handlePrintTicket
          }
        />

      </main>

      {/* RESET */}

      <div className="cinema-actions">

        <button
          className="reset-button"
          onClick={
            handleResetStorage
          }
        >
          Reset Cinema Seats
        </button>

        {/* REQUIRED TMDB ATTRIBUTION */}

        <p className="tmdb-credit">
          This product uses the TMDB API
          but is not endorsed or certified
          by TMDB.
        </p>

      </div>

    </div>
  );
}

// ===============================
// MOVIE SELECTOR
// ===============================

function MovieSelector({
  selectedMovie,
  setSelectedMovie,
  movies
}) {
  return (
    <div className="movie-selector">

      <label>
        SELECT MOVIE
      </label>

      <select
        value={
          selectedMovie
        }
        onChange={(event) =>
          setSelectedMovie(
            event.target.value
          )
        }
      >

        {movies.map(
          (movie) => (
            <option
              key={
                movie.id
              }
              value={
                movie.id
              }
            >
              {
                movie.name
              }
            </option>
          )
        )}

      </select>

    </div>
  );
}

// ===============================
// DATE SELECTOR
// ===============================

function DateSelector({
  dates,
  selectedDate,
  setSelectedDate
}) {
  return (
    <div className="selection-section">

      <div className="selection-label">
        SELECT DATE
      </div>

      <div className="date-options">

        {dates.map(
          (date) => (
            <button
              key={
                date.value
              }
              className={
                selectedDate ===
                  date.value
                  ? "date-option active"
                  : "date-option"
              }
              onClick={() =>
                setSelectedDate(
                  date.value
                )
              }
            >

              <strong>
                {
                  date.label
                }
              </strong>

              <span>
                {
                  date.fullDate
                }
              </span>

            </button>
          )
        )}

      </div>

    </div>
  );
}

// ===============================
// SHOWTIME SELECTOR
// ===============================

function ShowtimeSelector({
  times,
  selectedShowtime,
  setSelectedShowtime
}) {
  return (
    <div className="selection-section">

      <div className="selection-label">
        SELECT SHOWTIME
      </div>

      <div className="showtime-options">

        {times.map(
          (time) => (
            <button
              key={time}
              className={
                selectedShowtime ===
                  time
                  ? "showtime active"
                  : "showtime"
              }
              onClick={() =>
                setSelectedShowtime(
                  time
                )
              }
            >
              🕐 {time}
            </button>
          )
        )}

      </div>

    </div>
  );
}

// ===============================
// SEAT TYPE
// ===============================

function SeatTypeSelector({
  seatType,
  setSeatType
}) {
  return (
    <div className="seat-type-selector">

      <button
        className={
          seatType ===
            "regular"
            ? "seat-type active"
            : "seat-type"
        }
        onClick={() =>
          setSeatType(
            "regular"
          )
        }
      >
        <span>
          Regular
        </span>

        <small>
          ${regularPrice} / seat
        </small>
      </button>

      <button
        className={
          seatType === "vip"
            ? "seat-type vip-active"
            : "seat-type"
        }
        onClick={() =>
          setSeatType(
            "vip"
          )
        }
      >
        <span>
          VIP
        </span>

        <small>
          ${vipPrice} / seat
        </small>
      </button>

    </div>
  );
}

// ===============================
// SEAT LAYOUT
// ===============================

function SeatLayout({
  seats,
  selectedSeats,
  handleSeatClick,
  seatType
}) {
  const rows = {};

  seats.forEach(
    (seat) => {

      const row =
        seat.name.split(
          seatType === "vip"
            ? "-"
            : ""
        )[
        seatType === "vip"
          ? 1
          : 0
        ];

      if (!rows[row]) {
        rows[row] = [];
      }

      rows[row].push(
        seat
      );
    }
  );

  return (
    <div className="seat-layout">

      {Object.entries(
        rows
      ).map(
        ([row, rowSeats]) => (

          <div
            className="seat-row"
            key={row}
          >

            <span className="row-label">
              {row}
            </span>

            <div className="row-seats">

              {rowSeats.map(
                (seat) => {

                  const isSelected =
                    selectedSeats.includes(
                      seat.id
                    );

                  return (
                    <button
                      key={
                        seat.id
                      }
                      className={`seat ${isSelected
                        ? "selected"
                        : ""
                        } ${seat.occupied
                          ? "occupied"
                          : ""
                        } ${seat.type ===
                          "vip"
                          ? "vip-seat"
                          : ""
                        }`}
                      onClick={() =>
                        handleSeatClick(
                          seat.id
                        )
                      }
                      disabled={
                        seat.occupied
                      }
                    >
                      {
                        seat.name
                      }
                    </button>
                  );
                }
              )}

            </div>

          </div>

        )
      )}

    </div>
  );
}

// ===============================
// BOOKING SUMMARY
// ===============================

function BookingSummary({
  movie,
  selectedDate,
  selectedShowtime,
  seatType,
  selectedSeats,
  pricePerSeat,
  total,
  handleBooking,
  seatError,
  booking,
  handlePrintTicket
}) {
  return (
    <aside className="booking-card">

      {!booking ? (
        <>

          <div className="booking-card-header">

            <span>
              YOUR BOOKING
            </span>

            <h2>
              Booking Summary
            </h2>

          </div>

          <div className="movie-info">

            <span>
              MOVIE
            </span>

            <h3>
              {
                movie.name
              }
            </h3>

          </div>

          <div className="summary-section">

            <div className="summary-line">
              <span>
                Date
              </span>

              <strong>
                {
                  selectedDate.fullDate
                }
              </strong>
            </div>

            <div className="summary-line">
              <span>
                Showtime
              </span>

              <strong>
                {
                  selectedShowtime
                }
              </strong>
            </div>

            <div className="summary-line">
              <span>
                Seat Type
              </span>

              <strong>
                {
                  seatType ===
                    "vip"
                    ? "VIP"
                    : "Regular"
                }
              </strong>
            </div>

            <div className="summary-line">
              <span>
                Price / Seat
              </span>

              <strong>
                $
                {
                  pricePerSeat
                }
              </strong>
            </div>

          </div>

          <div className="selected-section">

            <div className="selected-title">

              <span>
                SELECTED SEATS
              </span>

              <strong>
                {
                  selectedSeats.length
                }
              </strong>

            </div>

            {selectedSeats.length >
              0 ? (

              <div className="selected-seat-list">

                {selectedSeats.map(
                  (seat) => (
                    <span
                      key={
                        seat.id
                      }
                    >
                      {
                        seat.name
                      }
                    </span>
                  )
                )}

              </div>

            ) : (

              <p className="no-seats">
                No seats selected
              </p>

            )}

          </div>

          {seatError && (
            <p className="seat-error">
              {
                seatError
              }
            </p>
          )}

          <div className="total-section">

            <span>
              TOTAL
            </span>

            <strong>
              $
              {
                total
              }
            </strong>

          </div>

          <button
            className="confirm-button"
            onClick={
              handleBooking
            }
            disabled={
              selectedSeats.length ===
              0
            }
          >
            Confirm Booking
          </button>

        </>
      ) : (

        <div className="ticket">

          <div className="ticket-top">

            <div className="ticket-icon">
              ✓
            </div>

            <span>
              BOOKING CONFIRMED
            </span>

            <h2>
              Your Movie Ticket
            </h2>

          </div>

          <div className="ticket-divider"></div>

          <div className="ticket-info">

            <div>

              <span>
                MOVIE
              </span>

              <strong>
                {
                  booking.movie
                }
              </strong>

            </div>

            <div className="ticket-grid">

              <div>

                <span>
                  DATE
                </span>

                <strong>
                  {
                    booking.date
                  }
                </strong>

              </div>

              <div>

                <span>
                  TIME
                </span>

                <strong>
                  {
                    booking.showtime
                  }
                </strong>

              </div>

            </div>

            <div>

              <span>
                SEAT TYPE
              </span>

              <strong>
                {
                  booking.seatType ===
                    "vip"
                    ? "VIP"
                    : "Regular"
                }
              </strong>

            </div>

            <div>

              <span>
                SEATS
              </span>

              <div className="ticket-seats">

                {booking.seats.map(
                  (seat) => (
                    <span
                      key={
                        seat.id
                      }
                    >
                      {
                        seat.name
                      }
                    </span>
                  )
                )}

              </div>

            </div>

            <div className="ticket-total">

              <span>
                TOTAL
              </span>

              <strong>
                $
                {
                  booking.total
                }
              </strong>

            </div>

          </div>

          <div className="booking-id">

            Booking ID:{" "}
            <strong>
              {
                booking.id
              }
            </strong>

          </div>

          <button
            className="print-button"
            onClick={
              handlePrintTicket
            }
          >
            🖨 Print Ticket
          </button>

          <button
            className="new-booking-button"
            onClick={() =>
              window.location.reload()
            }
          >
            Book Another Movie
          </button>

        </div>

      )}

    </aside>
  );
}

ReactDOM.createRoot(
  document.getElementById(
    "root"
  )
).render(
  <App />
);