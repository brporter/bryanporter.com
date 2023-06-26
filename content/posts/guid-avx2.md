---
title: "Comparing GUID's in .NET Core As Fast As Possible"
description: Comparisons, let's do them fast.
date: 2023-06-25T14:23:00Z
categories:
  - "Performance"
tags:
  - ".NET"
menu:
  main:
    name: Comparing GUID's
    weight: 4
---
## Update: FAST? Not so fast.

After poking around with the code some more, I realized that my gains weren't really my gains. This approach used below is not appreciably faster than what's available in box. The big difference in my earlier test seemed to be around parameter handling and the structure of my benchmark.

Below is a table of updated results, comparing all the ways possible to compare GUID's, including my approach (FastEquals / NotFastEquals) and you can see in the equality case I'm basically the same. I do win for the case where the two GUID's aren't equal.

```
|            Method |      Mean |     Error |    StdDev | Allocated |
|------------------ |----------:|----------:|----------:|----------:|
|        EqualsSame | 1.0788 ns | 0.0067 ns | 0.0063 ns |         - |
|     EqualsNotSame | 1.0830 ns | 0.0140 ns | 0.0131 ns |         - |
|    EqualsOperator | 1.1643 ns | 0.0070 ns | 0.0062 ns |         - |
| NotEqualsOperator | 1.1737 ns | 0.0109 ns | 0.0102 ns |         - |
|        FastEquals | 1.1016 ns | 0.0153 ns | 0.0143 ns |         - |
|     NotFastEquals | 0.3131 ns | 0.0032 ns | 0.0029 ns |         - |
```

Updated benchmark and class (this time, my equality comparison is implemented as an extension method):

```c#
[MemoryDiagnoser]
public class GuidComparisons
{
    const string g1 = "{DDDC3C9F-AEBF-4E28-A257-51EDC6787B1B}";
    const string g2 = "{22EACBE3-F4A1-4C89-A84F-521D024C4FA2}";

    private readonly Guid _g1 = new Guid(g1);
    private readonly Guid _same = new Guid(g1);
    private readonly Guid _g2 = new Guid(g2);

    [Benchmark]
    public bool EqualsSame() => _g1.Equals(_same);

    [Benchmark]
    public bool EqualsNotSame() => _g1.Equals(_g2);

    [Benchmark]
    public bool EqualsOperator() => _g1 == _same;

    [Benchmark]
    public bool NotEqualsOperator() => _g1 != _same;

    [Benchmark]
    public bool FastEquals() => _g1.FastEquals(_same);

    [Benchmark]
    public bool NotFastEquals() => _g1.FastEquals(_g2);
}

public static class GuidExtensions
{
    public static unsafe bool FastEquals(this Guid right, Guid left)
    {
        if (!Sse2.IsSupported)
        {
            return right == left;
        }

        byte* leftBytes = (byte*)&left;
        byte* rightBytes = (byte*)&right;

        Vector128<byte> leftVec = Sse2.LoadVector128(leftBytes);
        Vector128<byte> rightVec = Sse2.LoadVector128(rightBytes);

        uint match = (uint)Sse2.MoveMask(Sse2.CompareEqual(leftVec, rightVec));

        return BitOperations.TrailingZeroCount(match) == 0;
    }
}
```

Oh well! I did learn a bit about AVX / SSE2 intrinsics and how to use them, it just turns out the implementation of Guid.Equals is already doing something similar with similar performance as a result.

## Original Post Below

I have a code base that uses a large number of GUID's for labeling various segmented data structures. Doing this fast is important; every little bit of performance helps. 

I've also wanted to play around with AVX intrinsics that are wrapped up nicely in the `System.Runtime.Intrinsics` namespace in .NET, as I've got ideas around leveraging this for large data structure parsing exercies. I believe everything here is available since .NET Core 3.1.

<!--more-->

## Comparing GUID's

GUID's are 16 byte data structures. We can take advantage of this to perform vector loads and comparisons on two GUID's with a bit of unsafe code. The result is a 50% reduction in comparison time on average. Now, we're not talking dozens of nanoseconds on my hardware, but every little bit helps.

From BenchmarkDotNet:

```
|               Method |     Mean |     Error |    StdDev | Allocated |
|--------------------- |---------:|----------:|----------:|----------:|
|  CompareGuidsWithAvx | 1.942 ns | 0.0083 ns | 0.0078 ns |         - |
| CompareGuidsOriginal | 3.739 ns | 0.0170 ns | 0.0150 ns |         - |
```

1.9ns < 3.7ns last time I checked. Hurray!

## How?

Pretty simple, actually.

```c#
    public unsafe static bool CompareGuidsAvx(Guid g1, Guid g2)
    {
        // take the address of both GUID's
        byte* g1bytes = (byte*)&g1;
        byte* g2bytes = (byte*)&g2;

        // load both GUID's into Vector128<bytes> using AVX intrinsics
        // sadly, these are unaligned loads
        Vector128<byte> g1vec = Avx.LoadVector128(g1bytes);
        Vector128<byte> g2vec = Avx.LoadVector128(g2bytes);

        // found will be initialized to a bitmask of differences
        uint found = (uint)Avx2.MoveMask(Avx2.CompareEqual(g1vec, g2vec));

        // if there are no differences, there should be no trailing zeros in the bitmask
        return BitOperations.TrailingZeroCount(found) == 0;
    }
```

For comparison to the 'default' way to compare GUID's, I wrote a function that does the super obvious thing:

```c#
    public static bool CompareGuidsOriginal(Guid g1, Guid g2)
    {
        return g1 == g2;
    }
```

## Benchmark!

Here is the complete benchmark class.

```c#
public class GuidComparisons
{
    Guid g1 = Guid.NewGuid();
    Guid g2 = Guid.NewGuid();

    [Benchmark]
    public void CompareGuidsWithAvx()
    {
        if (CompareGuidsAvx(g1, g2)) throw new InvalidOperationException();
        if (!CompareGuidsAvx(g1, g1)) throw new InvalidOperationException();
        if (!CompareGuidsAvx(g2, g2)) throw new InvalidOperationException();
    }

    [Benchmark]
    public void CompareGuidsOriginal()
    {
        if (CompareGuidsOriginal(g1, g2)) throw new InvalidOperationException();
        if (!CompareGuidsOriginal(g1, g1)) throw new InvalidOperationException();
        if (!CompareGuidsOriginal(g2, g2)) throw new InvalidOperationException();
    }

    public unsafe static bool CompareGuidsAvx(Guid g1, Guid g2)
    {
        byte* g1bytes = (byte*)&g1;
        byte* g2bytes = (byte*)&g2;

        Vector128<byte> g1vec = Avx.LoadVector128(g1bytes);
        Vector128<byte> g2vec = Avx.LoadVector128(g2bytes);

        uint found = (uint)Avx2.MoveMask(Avx2.CompareEqual(g1vec, g2vec));

        return BitOperations.TrailingZeroCount(found) == 0;
    }

    public static bool CompareGuidsOriginal(Guid g1, Guid g2)
    {
        return g1 == g2;
    }
}

```

