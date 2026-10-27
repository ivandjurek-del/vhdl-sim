-- Testbench za zbrajalo4
-- Ulazne brojeve upišite bit po bit (jedna naredba po retku).
-- Primjer: A = 1011 (11), B = 0110 (6)  ->  17 = 1 0001

library ieee;
use ieee.std_logic_1164.all;

entity zbrajalo4_tb is
end entity zbrajalo4_tb;

architecture sim of zbrajalo4_tb is
begin
  stim : process
  begin
    -- početno stanje: sve 0, pričekaj da se sklop smiri
    a3 <= '0';
    a2 <= '0';
    a1 <= '0';
    a0 <= '0';
    b3 <= '0';
    b2 <= '0';
    b1 <= '0';
    b0 <= '0';
    cin <= '0';
    wait for 20 ns;

    -- >>> A = 1011 <<<
    a3 <= '1';
    a2 <= '0';
    a1 <= '1';
    a0 <= '1';
    -- >>> B = 0110 <<<
    b3 <= '0';
    b2 <= '1';
    b1 <= '1';
    b0 <= '0';
    -- >>> Cin <<<
    cin <= '0';
    wait for 80 ns;
    wait;
  end process;
end architecture sim;
