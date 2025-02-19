import { Oath, OATH_NULL } from "@/supplement/oath.ts";
import { expect, test } from "@playwright/test";

test.describe("simple oath", () => {
	test.describe("callback syntax", () => {
		test("return a value", async () => {
			const [value, error] = await new Oath<string, Error>(Error, ({ resolve }) =>
				resolve("Hello, World!")
			).run();

			expect(value, "value correct").toBe("Hello, World!");
			expect(error, "error not present").toBe(OATH_NULL);
		});

		test("return an expected error", async () => {
			const syntaxError = new SyntaxError("Something expected went wrong.");
			const [value, error] = await new Oath<string, SyntaxError>(SyntaxError, ({ reject }) =>
				reject(syntaxError)
			).run();

			expect(value, "no value returned").toBe(OATH_NULL);
			expect(error, "error correct").toBe(syntaxError);
		});

		test("throw an expected error", async () => {
			const syntaxError = new SyntaxError("Something expected went wrong.");
			const [value, error] = await new Oath<string, SyntaxError>(SyntaxError, () => {
				throw syntaxError;
			}).run();

			expect(value, "no value returned").toBe(OATH_NULL);
			expect(error, "error correct").toBe(syntaxError);
		});

		test("chuck an unexpected error", async () => {
			const rangeError = new RangeError("Something unexpected happened.");
			const oath = new Oath<string, SyntaxError>(SyntaxError, ({ chuck }) =>
				chuck(rangeError)
			);

			await expect(oath.run()).rejects.toThrow(rangeError);
		});

		test("throw an unexpected error", async () => {
			const rangeError = new RangeError("Something unexpected happened.");
			const oath = new Oath<string, SyntaxError>(SyntaxError, () => {
				throw rangeError;
			});

			await expect(oath.run()).rejects.toThrow(rangeError);
		});
	});

	test.describe("async/await syntax", () => {
		test("return a value", async () => {
			const [value, error] = await Oath.fromAsync<string, Error>(
				Error,
				// eslint-disable-next-line @typescript-eslint/require-await
				async () => "Hello, World!"
			).run();

			expect(value, "value correct").toBe("Hello, World!");
			expect(error, "error not present").toBe(OATH_NULL);
		});

		test("throw an expected error", async () => {
			const syntaxError = new SyntaxError("Something expected went wrong.");
			const [value, error] = await Oath.fromAsync<string, SyntaxError>(
				SyntaxError,
				// eslint-disable-next-line @typescript-eslint/require-await
				async () => {
					throw syntaxError;
				}
			).run();

			expect(value, "no value returned").toBe(OATH_NULL);
			expect(error, "error correct").toBe(syntaxError);
		});

		test("throw an unexpected error", async () => {
			const rangeError = new RangeError("Something unexpected happened.");
			const oath = Oath.fromAsync<string, SyntaxError>(
				SyntaxError,
				// eslint-disable-next-line @typescript-eslint/require-await
				async () => {
					throw rangeError;
				}
			);

			await expect(oath.run()).rejects.toThrow(rangeError);
		});
	});
});

test.describe("various mappings", () => {
	test("basic map", async () => {
		const [value, error] = await new Oath<string, Error>(Error, ({ resolve }) =>
			resolve("Hello")
		)
			.map(hello => `${hello}, World!`)
			.map(helloWorld => `${helloWorld} Today is a good day!`)
			.run();

		expect(value, "oath mapped correctly").toBe("Hello, World! Today is a good day!");
		expect(error, "no error returned").toBe(OATH_NULL);
	});

	test("map until error", async () => {
		const [value, error] = await new Oath<string, TypeError>(TypeError, ({ resolve }) =>
			resolve("Hello")
		)
			.map(hello => `${hello}, World!`)
			.map(() => {
				throw new TypeError("Error was thrown");
			})
			.map(thing => `${thing} This should not appear`)
			.run();

		expect(value, "no value returned").toBe(OATH_NULL);
		expect(error, "error correct class").toBeInstanceOf(TypeError);
		expect(error, "error correct message").toHaveProperty("message", "Error was thrown");
	});

	test("error multiple times", async () => {
		const firstError = new TypeError("First reject");
		const [value, error] = await new Oath(TypeError, () => {
			throw firstError;
		})
			.map(() => {
				throw new TypeError("Second reject");
			})
			.run();

		expect(value, "no value returned").toBe(OATH_NULL);
		expect(error, "first error returned").toBe(firstError);
	});
});

test.describe("expected vs unexpected errors", () => {
	test("expected error returned as value", async () => {
		const [value, error] = await new Oath<never, SyntaxError>(SyntaxError, () => {
			throw new SyntaxError("Error was set");
		}).run();

		expect(value, "no value returned").toBe(OATH_NULL);
		expect(error, "expected error returned as value").toBeInstanceOf(SyntaxError);
		expect(error, "expected error correct message").toHaveProperty("message", "Error was set");
	});

	test("unexpected error thrown", async () => {
		const oath = new Oath(SyntaxError, () => {
			throw new RangeError("This is an unexpected error");
		});
		await expect(oath.run(), "throw correct exception").rejects.toThrow(RangeError);
	});

	test("expected error mapped to different error not thrown", async () => {
		const cause = new SyntaxError("This is an unexpected error");
		const [value, error] = await new Oath(SyntaxError, () => {
			throw cause;
		})
			.mapError(TypeError, cause => new TypeError("Now it's expected", { cause }))
			.run();

		expect(value, "no value returned").toBe(OATH_NULL);
		expect(error, "error was expected").toBeInstanceOf(TypeError);
		expect(error, "error correct message").toHaveProperty("message", "Now it's expected");
		expect(error, "error correct cause").toHaveProperty("cause", cause);
	});

	test("expected error mapped to unexpected error thrown", async () => {
		const oath = new Oath(SyntaxError, () => {
			throw new SyntaxError("This is expected");
		}).mapError<SyntaxError>(SyntaxError, () => {
			return new RangeError("This is unexpected.");
		});

		await expect(oath.run(), "throw unexpected error").rejects.toThrow(RangeError);
	});

	test("unexpected error thrown in error map thrown", async () => {
		const oath = new Oath(SyntaxError, () => {
			throw new SyntaxError("This is expected");
		}).mapError<SyntaxError>(SyntaxError, () => {
			throw new RangeError("This is unexpected.");
		});

		await expect(oath.run(), "throw unexpected error").rejects.toThrow(RangeError);
	});

	test("expected error thrown in error map not thrown", async () => {
		const cause = new SyntaxError("This is expected");
		const [value, error] = await new Oath(SyntaxError, () => {
			throw cause;
		})
			.mapError<SyntaxError>(SyntaxError, cause => {
				throw new SyntaxError("Again unexpected.", { cause });
			})
			.run();

		expect(value, "no value returned").toBe(OATH_NULL);
		expect(error, "error correct type").toBeInstanceOf(SyntaxError);
		expect(error, "error correct message").toHaveProperty("message", "Again unexpected.");
		expect(error, "error correct cause").toHaveProperty("cause", cause);
	});

	test("value type of OATH_NULL should not throw", async () => {
		const [value, error] = await new Oath<typeof OATH_NULL, Error>(Error, ({ resolve }) =>
			resolve(OATH_NULL)
		).run();

		expect(value).toBe(OATH_NULL);
		expect(error).toBe(OATH_NULL);
	});
});
