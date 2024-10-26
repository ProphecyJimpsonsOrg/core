use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

declare_id!("CDSXanmPbW46F8mSpWvC6hvFnqn9hikPcPEKPjWCo7ov");

#[program]
pub mod presale_program {
    use super::*;

    pub fn create_presale(
        ctx: Context<CreatePresale>,
        price_per_token: u64,
        total_tokens: u64,
        presale_start: i64,
        presale_end: i64,
    ) -> Result<()> {
        let presale = &mut ctx.accounts.presale;
        presale.admin = ctx.accounts.admin.key();
        presale.token_mint = ctx.accounts.token_mint.key();
        presale.price_per_token = price_per_token;
        presale.total_tokens = total_tokens;
        presale.tokens_sold = 0;
        presale.presale_start = presale_start;
        presale.presale_end = presale_end;

        let cpi_accounts = Transfer {
            from: ctx.accounts.admin_token_account.to_account_info(),
            to: ctx.accounts.presale_token_vault.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, total_tokens)?;

        Ok(())
    }

    pub fn participate(ctx: Context<Participate>, amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        require!(
            current_time >= ctx.accounts.presale.presale_start
                && current_time <= ctx.accounts.presale.presale_end,
            PresaleError::PresaleNotActive
        );

        require!(
            ctx.accounts.presale.tokens_sold + amount <= ctx.accounts.presale.total_tokens,
            PresaleError::InsufficientTokens
        );

        let total_cost = amount
            .checked_mul(ctx.accounts.presale.price_per_token)
            .ok_or(PresaleError::CalculationError)?;

        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.admin.to_account_info(),
                },
            ),
            total_cost,
        )?;

        let seeds = &[b"presale".as_ref(), &[ctx.bumps.presale]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.presale_token_vault.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.presale.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        ctx.accounts.presale.tokens_sold += amount;

        emit!(PresaleParticipation {
            buyer: *ctx.accounts.buyer.key,
            amount,
            total_cost,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreatePresale<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 8,
        seeds = [b"presale"],
        bump
    )]
    pub presale: Account<'info, PresaleConfig>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = token_mint,
        associated_token::authority = presale,
    )]
    pub presale_token_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = admin,
    )]
    pub admin_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Participate<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub admin: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"presale"],
        bump,
    )]
    pub presale: Account<'info, PresaleConfig>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = token_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = presale,
    )]
    pub presale_token_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[account]
pub struct PresaleConfig {
    pub admin: Pubkey,
    pub token_mint: Pubkey,
    pub price_per_token: u64,
    pub total_tokens: u64,
    pub tokens_sold: u64,
    pub presale_start: i64,
    pub presale_end: i64,
}

#[error_code]
pub enum PresaleError {
    #[msg("Presale is not active")]
    PresaleNotActive,

    #[msg("Insufficient tokens available")]
    InsufficientTokens,

    #[msg("Calculation error")]
    CalculationError,
}

#[event]
pub struct PresaleParticipation {
    pub buyer: Pubkey,
    pub amount: u64,
    pub total_cost: u64,
}
